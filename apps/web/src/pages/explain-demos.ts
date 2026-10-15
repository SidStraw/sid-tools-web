// Authored PostgreSQL-shaped fixtures, not live database measurements.
export const explainDemos = {
  analyze: JSON.stringify(
    [
      {
        Plan: {
          'Node Type': 'Nested Loop',
          'Startup Cost': 0,
          'Total Cost': 100,
          'Plan Rows': 10,
          'Actual Rows': 100,
          'Actual Loops': 1,
          'Actual Startup Time': 1,
          'Actual Total Time': 8,
          'Shared Hit Blocks': 12,
          Plans: [
            {
              'Node Type': 'Index Scan',
              'Relation Name': 'example_items',
              'Startup Cost': 0,
              'Total Cost': 2,
              'Plan Rows': 1,
              'Actual Rows': 10,
              'Actual Loops': 10,
              'Actual Startup Time': 0.1,
              'Actual Total Time': 0.5,
              'Shared Hit Blocks': 10,
              'I/O Read Time': 0.2,
            },
          ],
        },
        'Execution Time': 9,
      },
    ],
    null,
    2,
  ),
  estimate: JSON.stringify(
    [
      {
        Plan: {
          'Node Type': 'Seq Scan',
          'Relation Name': 'example_items',
          'Startup Cost': 0,
          'Total Cost': 25,
          'Plan Rows': 10,
        },
      },
    ],
    null,
    2,
  ),
  partial: JSON.stringify(
    [
      {
        Plan: {
          'Node Type': 'Append',
          'Startup Cost': 0,
          'Total Cost': 20,
          'Plan Rows': 30,
          'Actual Rows': 2,
          'Plan Width': 8,
          Plans: [
            {
              'Node Type': 'Index Scan',
              'Startup Cost': 0,
              'Total Cost': 5,
              'Plan Rows': 20,
              'Actual Rows': 0,
              'Actual Loops': 0,
            },
            {
              'Node Type': 'Seq Scan',
              'Startup Cost': 0,
              'Total Cost': 15,
              'Plan Rows': 10,
              'Actual Rows': 2,
              'Actual Loops': 1,
            },
          ],
        },
        'Execution Time': 3,
      },
    ],
    null,
    2,
  ),
} as const;
