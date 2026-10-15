export const composeDemos = {
  declared: {
    source: `services:
  web:
    image: synthetic-web
    depends_on:
      db:
        condition: service_healthy
        required: true
        restart: true
    networks: [frontend]
    volumes: [cache:/cache, ./synthetic:/workspace, /scratch]
  db:
    image: synthetic-db
    volumes:
      - type: volume
        source: data
        target: /data
networks:
  frontend: {}
volumes:
  data: {}
  cache: {}
  unused: {}
`,
    note: '人工合成：web → db 是 depends_on，不是網路連線。Frontend network、cache named volume、bind、anonymous mount 分開列出；db 未寫 networks，標示 implicit default。Unused volume 不造 attachment。service_healthy 只是宣告，沒有檢查 health。',
  },
  conditional: {
    source: `services:
  app:
    image: synthetic-app
    depends_on:
      db:
        condition: service_started
        required: false
    networks: [shared]
  db:
    image: synthetic-db
    profiles: [database]
    networks: [shared]
    volumes: [external-data:/data]
networks:
  shared:
    external: true
volumes:
  external-data:
    external: true
`,
    note: '人工合成：沒有選擇任何 profiles。Db 有定義、但需 database profile；optional profiled dependency 不是 undeclared target，不自動啟用。External network／volume 存在與否皆 not-checked，partial 不等於無效部署。',
  },
  missing: {
    source: `services:
  app:
    image: synthetic-app
    depends_on:
      absent:
        condition: service_started
        required: false
    networks: [missing-network]
    volumes: [missing-volume:/data]
`,
    note: '人工合成：undeclared target 即使 required:false，官方 Compose v5.5.0 primary config 仍拒絕；本工具標 reference error，不混同於已定義的 profiled optional dependency。缺少 network／volume 不造節點。',
  },
  cycles: {
    source: `services:
  first:
    image: synthetic-first
    depends_on: [second]
  second:
    image: synthetic-second
    depends_on: [first]
  optional-a:
    image: synthetic-optional-a
    profiles: [testing]
    depends_on: [optional-b]
  optional-b:
    image: synthetic-optional-b
    profiles: [testing]
    depends_on: [optional-a]
`,
    note: '人工合成：first／second 有無條件循環，invalid。Testing profile 的另一組 SCC 是 conditional，不表示每種 activation 都有 cycle；沒有選任何 profiles。SCC 成員清單不是捏造的執行順序。',
  },
  unresolved: {
    source: `include: [synthetic-other.yaml]
services:
  app:
    image: \${SYNTHETIC_IMAGE:-synthetic-app}
    depends_on: ["\${SYNTHETIC_DEP}"]
    extends:
      file: synthetic-base.yaml
      service: base
    environment:
      NOTE: $SYNTHETIC_UNSET
    volumes:
      - type: volume
        source: \${SYNTHETIC_VOLUME:-data}
        target: /data
`,
    note: '人工合成：插值即使有 default 也不求值、不代空字串。Include／extends／env／多檔不讀取；dynamic reference 保持 unresolved，不當 literal missing。繼承的 network 未知時不猜 default attachment。',
  },
  unsupported: {
    source: `services:
  app:
    image: synthetic-app
    network_mode: host
    command: [echo, synthetic-private-command]
    future_option: synthetic-private-value
x-synthetic:
  note: synthetic-private-extension
`,
    note: '人工合成：network_mode 未處理，不猜 network edges；其他非 extension clauses 保守 partial。x-* 明示忽略並提示，不把它當 schema 錯誤。Command／任意值不保留於報告或摘要。',
  },
  invalid: {
    source: 'services:\n  app:\n    image: synthetic-app\n    networks: null\n',
    note: '人工合成：service networks:null 是結構錯誤，不是 absent／空 []／{}，不能自動接 default。官方 Compose v5.5.0 primary 與 --no-interpolate 皆拒絕。',
  },
  alias: {
    source: 'services:\n  app: &synthetic\n    image: synthetic-app\n  other: *synthetic\n',
    note: '人工合成：anchors／aliases 在 Composer 前列為不支援；partial 且沒有可用 graph，不是假裝完成 YAML merge。',
  },
  limit: {
    source: '['.repeat(100) + ']'.repeat(100),
    note: '人工合成深度超限：collection depth 上限 64。Limit 清除所有 model arrays，不產出截斷成功圖。',
  },
} as const;
