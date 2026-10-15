import type {
  SqlDdlReport,
  SqlTableName,
  SqlIdentifier,
  SqlLocation,
  SqlForeignKey,
} from '@sid-tools/core/sql-ddl';
const NS = 'http://www.w3.org/2000/svg';
// XML 1.0 cannot represent every JavaScript code unit. Show controls and lone
// surrogates explicitly instead of silently removing names or emitting bad XML.
const xmlDisplay = (value: string) => {
  let result = '';
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code >= 0xd800 && code <= 0xdbff && i + 1 < value.length) {
      const next = value.charCodeAt(i + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        result += value[i]! + value[++i]!;
        continue;
      }
    }
    result +=
      code < 32 ||
      (code >= 127 && code <= 159) ||
      (code >= 0xd800 && code <= 0xdfff) ||
      code === 0xfffe ||
      code === 0xffff
        ? `\\u${code.toString(16).padStart(4, '0')}`
        : value[i];
  }
  return result;
};
export const identifierText = (value: SqlIdentifier) =>
  value.quoted ? `"${value.name.replaceAll('"', '""')}"` : value.name;
export const tableText = (value: SqlTableName) =>
  `${value.schema ? `${identifierText(value.schema)}.` : ''}${identifierText(value.name)}`;
export const relationshipText = (edge: SqlForeignKey) =>
  `${edge.sourceColumns.map(identifierText).join(', ')} → ${tableText(edge.target)} (${edge.targetColumns?.map(identifierText).join(', ') ?? (edge.binding.targetColumnsOrigin === 'target-primary-key' ? 'implicit target PK' : 'target columns unknown')})`;
export interface DiagramActions {
  source: (location: SqlLocation, label: string) => void;
  relationship: (edge: SqlForeignKey) => void;
}
interface Card {
  x: number;
  y: number;
  height: number;
  columns: Map<string, number>;
}
// Only app-owned names/attributes and numeric geometry. Source text is never markup,
// path data, IDs, style, resource URLs or attribute names. Export serializes this tree.
export function renderSqlDdlSvg(report: SqlDdlReport, actions?: DiagramActions): SVGSVGElement {
  if (
    report.tables.length > 100 ||
    report.edges.length > 1000 ||
    report.tables.reduce((sum, table) => sum + table.columns.length, 0) > 2000
  )
    throw new Error('Diagram budget');
  const svg = document.createElementNS(NS, 'svg');
  const shape = <K extends keyof SVGElementTagNameMap>(
    tag: K,
    attrs: Record<string, string | number> = {},
  ) => {
    const node = document.createElementNS(NS, tag);
    for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value));
    return node;
  };
  let textUnits = 0,
    lineCount = 0;
  const lines = (value: string) => {
    const display = xmlDisplay(value);
    textUnits += display.length;
    if (textUnits > 2000000) throw new Error('Diagram text budget');
    const chars = Array.from(display),
      result: string[] = [];
    for (let i = 0; i < chars.length; i += 32) result.push(chars.slice(i, i + 32).join(''));
    if (!result.length) result.push('');
    lineCount += result.length;
    if (lineCount > 100000) throw new Error('Diagram line budget');
    return result;
  };
  const text = (
    parent: SVGElement,
    x: number,
    y: number,
    rows: string[],
    size = 14,
    color = '#264c3a',
  ) => {
    const node = shape('text', {
      x,
      y,
      'font-family': 'monospace',
      'font-size': size,
      fill: color,
    });
    for (let i = 0; i < rows.length; i++) {
      const span = shape('tspan', { x, dy: i ? 20 : 0 });
      span.textContent = rows[i]!;
      node.append(span);
    }
    parent.append(node);
  };
  const interactive = (node: SVGElement, label: string, action: () => void) => {
    if (!actions) return;
    node.setAttribute('role', 'button');
    node.setAttribute('tabindex', '0');
    node.setAttribute('aria-label', label);
    node.addEventListener('click', action);
    node.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        action();
      }
    });
  };
  const title = shape('title');
  title.textContent = 'Accepted SQL declarations and explicit foreign keys';
  const desc = shape('desc');
  desc.textContent =
    'Local static subset, not database validation or migration final state. Solid resolved-local, dashed local-candidate. Unresolved and invalid declarations are listed without invented nodes. Control code units and lone surrogates are displayed as explicit Unicode escapes, never silently removed.';
  svg.append(title, desc);
  svg.setAttribute('role', 'img');
  svg.setAttribute(
    'aria-label',
    'SQL declaration atlas with tables, columns, keys and relationship binding legend',
  );
  const drawn = report.edges.filter(
    (edge) =>
      ['resolved-local', 'local-candidate'].includes(edge.binding.status) &&
      report.tables.some((table) => table.id === edge.binding.targetTableId) &&
      report.tables.some((table) => table.id === edge.sourceTableId),
  );
  const rail = 48 + drawn.length * 12,
    cardX = rail + 56,
    width = Math.max(760, cardX + 560),
    cards = new Map<string, Card>();
  let y = 150;
  const background = shape('rect', { x: 0, y: 0, width, height: 1, fill: '#f8f9f3' });
  svg.insertBefore(background, title);
  text(svg, 28, 34, [`DECLARATION ATLAS / ${report.status.toUpperCase()}`], 18);
  text(
    svg,
    28,
    62,
    [
      `${report.tables.length} tables / ${report.edges.length} declared FKs / ${report.diagnostics.length} diagnostics`,
    ],
    12,
  );
  text(
    svg,
    28,
    84,
    [
      report.status === 'complete'
        ? 'Covered declarations only; not DB validation.'
        : 'INCOMPLETE ACCEPTED MODEL — not the full schema.',
    ],
    12,
    report.status === 'complete' ? '#52694c' : '#8a532f',
  );
  text(
    svg,
    28,
    106,
    ['Solid: resolved-local. Dashed: local-candidate. Other FKs: records only.'],
    12,
  );
  const connections = shape('g'),
    tableLayer = shape('g');
  svg.append(connections, tableLayer);
  for (let ti = 0; ti < report.tables.length; ti++) {
    const table = report.tables[ti]!,
      group = shape('g', { 'data-table-index': ti });
    let cy = y + 28;
    const headerRows = lines(tableText(table.name)),
      headerHeight = headerRows.length * 20 + 60;
    const box = shape('rect', {
      x: cardX,
      y,
      width: 520,
      height: 1,
      rx: 10,
      fill: '#ffffff',
      stroke: '#cbd8c2',
      'stroke-width': 1,
    });
    group.append(box);
    const head = shape('g');
    head.append(
      shape('rect', { x: cardX, y, width: 520, height: headerHeight, rx: 10, fill: '#e8f0df' }),
    );
    text(head, cardX + 22, cy, headerRows, 14);
    cy += headerRows.length * 20 + 6;
    text(
      head,
      cardX + 22,
      cy,
      [`TABLE ${ti + 1} / ${table.status} / ${table.columns.length} columns`],
      11,
    );
    interactive(head, `Table ${ti + 1} source`, () =>
      actions?.source(table.location, tableText(table.name)),
    );
    group.append(head);
    cy = y + headerHeight;
    const positions = new Map<string, number>();
    for (let ci = 0; ci < table.columns.length; ci++) {
      const column = table.columns[ci]!,
        fk = table.foreignKeys.some((edge) =>
          edge.sourceColumns.some((name) => name.name === column.name.name),
        );
      const row = shape('g', { 'data-column-index': ci });
      const names = lines(`${ci + 1}. ${identifierText(column.name)}`),
        types = lines(column.dataType),
        height = (names.length + types.length) * 20 + 46;
      row.append(
        shape('rect', {
          x: cardX,
          y: cy,
          width: 520,
          height,
          fill: ci % 2 ? '#f6f9f1' : '#ffffff',
          stroke: '#e6ecdf',
          'stroke-width': 1,
        }),
      );
      text(row, cardX + 22, cy + 24, names, 14);
      text(row, cardX + 22, cy + 24 + names.length * 20, types, 12, '#637355');
      text(
        row,
        cardX + 22,
        cy + height - 12,
        [
          `${column.primaryKey ? 'PK · ' : ''}${fk ? 'FK · ' : ''}${column.nullable ? 'NULLABLE' : 'NOT NULL'}`,
        ],
        11,
      );
      positions.set(column.id, cy + height / 2);
      interactive(row, `Table ${ti + 1} column ${ci + 1} source`, () =>
        actions?.source(column.location, identifierText(column.name)),
      );
      group.append(row);
      cy += height;
    }
    if (table.primaryKey) {
      const pkRows = lines(`PK (${table.primaryKey.columns.map(identifierText).join(', ')})`),
        pk = shape('g');
      pk.append(
        shape('rect', {
          x: cardX,
          y: cy,
          width: 520,
          height: pkRows.length * 20 + 26,
          fill: '#edf3e5',
        }),
      );
      text(pk, cardX + 22, cy + 24, pkRows, 12);
      interactive(pk, `Table ${ti + 1} primary key source`, () =>
        actions?.source(table.primaryKey!.location, 'Primary key'),
      );
      group.append(pk);
      cy += pkRows.length * 20 + 26;
    }
    box.setAttribute('height', String(cy - y));
    cards.set(table.id, { x: cardX, y, height: cy - y, columns: positions });
    tableLayer.append(group);
    y = cy + 64;
  }
  for (let i = 0; i < drawn.length; i++) {
    const edge = drawn[i]!,
      from = cards.get(edge.sourceTableId)!,
      to = cards.get(edge.binding.targetTableId!)!;
    const sourceY = from.columns.get(edge.binding.sourceColumnIds[0] ?? '') ?? from.y + 30,
      targetY = to.columns.get(edge.binding.targetColumnIds[0] ?? '') ?? to.y + 30,
      self = from === to;
    const sy = self && sourceY === targetY ? sourceY - 6 : sourceY,
      ty = self && sourceY === targetY ? targetY + 6 : targetY,
      lane = 28 + i * 12;
    const path = shape('path', {
      d: `M ${cardX} ${sy} H ${lane} V ${ty} H ${cardX}`,
      fill: 'none',
      stroke: edge.binding.status === 'resolved-local' ? '#315e45' : '#a17a37',
      'stroke-width': 2,
      'data-edge-index': report.edges.indexOf(edge),
      'data-binding': edge.binding.status,
    });
    if (edge.binding.status === 'local-candidate') path.setAttribute('stroke-dasharray', '7 5');
    interactive(path, `Relationship ${report.edges.indexOf(edge) + 1} details`, () =>
      actions?.relationship(edge),
    );
    connections.append(
      path,
      shape('polygon', {
        points: `${cardX},${ty} ${cardX - 8},${ty - 5} ${cardX - 8},${ty + 5}`,
        fill: edge.binding.status === 'resolved-local' ? '#315e45' : '#a17a37',
      }),
    );
  }
  y += 12;
  text(svg, 28, y, ['RELATIONSHIP REGISTER / declared source order'], 16);
  y += 36;
  if (!report.edges.length) {
    text(svg, 28, y, ['No declared FK records; no inferred relationships.'], 12);
    y += 32;
  }
  for (let i = 0; i < report.edges.length; i++) {
    const edge = report.edges[i]!,
      sourceTable = report.tables.find((table) => table.id === edge.sourceTableId);
    const labelRows = lines(
        `${i + 1}. ${sourceTable ? tableText(sourceTable.name) : 'Source unavailable'}: ${relationshipText(edge)}`,
      ),
      meta = lines(
        `${edge.binding.status} / target columns: ${edge.binding.targetColumnsOrigin}${
          edge.binding.targetColumnsOrigin === 'target-primary-key'
            ? ` (${edge.binding.targetColumnIds
                .map((id) => {
                  const column = report.tables
                    .find((table) => table.id === edge.binding.targetTableId)
                    ?.columns.find((item) => item.id === id);
                  return column ? identifierText(column.name) : 'unavailable';
                })
                .join(', ')})`
            : ''
        }${edge.name ? ` / constraint ${identifierText(edge.name)}` : ''}`,
      ),
      optionRows = lines(
        `MATCH ${edge.options.match ?? 'unspecified'} / DELETE ${edge.options.onDelete ?? 'unspecified'} / UPDATE ${edge.options.onUpdate ?? 'unspecified'} / deferrable ${edge.options.deferrable ?? 'unspecified'} / initially ${edge.options.initially ?? 'unspecified'}`,
      ),
      height = (labelRows.length + meta.length + optionRows.length) * 20 + 34;
    const group = shape('g', { 'data-register-index': i });
    group.append(
      shape('rect', {
        x: 20,
        y: y - 20,
        width: width - 40,
        height,
        rx: 8,
        fill: edge.binding.status === 'resolved-local' ? '#edf3e5' : '#faf3e4',
        stroke: '#d9dfcf',
      }),
    );
    text(group, 36, y, labelRows, 14);
    text(group, 36, y + labelRows.length * 20 + 6, meta, 12);
    text(group, 36, y + (labelRows.length + meta.length) * 20 + 12, optionRows, 12);
    interactive(group, `Relationship ${i + 1} details`, () => actions?.relationship(edge));
    svg.append(group);
    y += height + 14;
  }
  const height = Math.max(260, y + 36);
  svg.setAttribute('width', String(width));
  svg.setAttribute('height', String(height));
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  background.setAttribute('height', String(height));
  svg.dataset.tables = String(report.tables.length);
  svg.dataset.columns = String(
    report.tables.reduce((count, table) => count + table.columns.length, 0),
  );
  svg.dataset.relationships = String(report.edges.length);
  return svg;
}
export function serializeSqlDdlSvg(svg: SVGSVGElement) {
  return new XMLSerializer().serializeToString(svg);
}
