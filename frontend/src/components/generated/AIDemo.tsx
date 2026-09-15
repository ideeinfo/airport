import { FormEvent, PointerEvent as ReactPointerEvent, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { filterCatalogByDiscipline } from "../../drawingFilters";
import { assetGlobalIds, groupAssets, layoutGraph, systemAssetGlobalIds } from "../../graphLayout";
import { AirflowAlarmContext, airflowAlarm, airflowContextChips, airflowDeviationPercent, buildAirflowAssistantQuestion } from "../../demoFlow";
const IFC_MODEL_URL = "/model/airport-mep-v2.glb";
type Page = "login" | "home" | "drawings" | "graph" | "assistant";
type IconName = "grid" | "drawing" | "graph" | "chat" | "search" | "bell" | "user" | "chevron" | "activity" | "bolt" | "alarm" | "work" | "building" | "filter" | "layers" | "expand" | "more" | "arrow" | "send" | "file" | "clock" | "check" | "warning" | "logout" | "spark" | "pin" | "link";
const paths: Record<IconName, ReactNode> = {
  grid: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
  drawing: <><path d="M4 4h16v16H4z" /><path d="M8 4v16M4 9h16M12 9v11M16 4v5" /></>,
  graph: <><circle cx="6" cy="6" r="2.5" /><circle cx="18" cy="6" r="2.5" /><circle cx="12" cy="18" r="2.5" /><path d="m8.2 7.2 2.7 8.4M15.8 7.2l-2.7 8.4M8.5 6h7" /></>,
  chat: <><path d="M4 5h16v12H9l-5 4z" /><path d="M8 9h8M8 13h5" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="m16.5 16.5 4 4" /></>,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
  chevron: <path d="m9 18 6-6-6-6" />,
  activity: <path d="M3 12h4l2.2-6 4.2 12 2.1-6H21" />,
  bolt: <path d="m13 2-9 12h8l-1 8 9-12h-8z" />,
  alarm: <><path d="M12 3 2.8 20h18.4z" /><path d="M12 9v4M12 17h.01" /></>,
  work: <><rect x="3" y="6" width="18" height="14" rx="2" /><path d="M8 6V4h8v2M3 11h18M10 14h4" /></>,
  building: <><path d="M4 21V5l8-3 8 3v16" /><path d="M9 21v-4h6v4M8 8h1M15 8h1M8 12h1M15 12h1" /></>,
  filter: <path d="M3 5h18l-7 8v6l-4 2v-8z" />,
  layers: <><path d="m12 2 9 5-9 5-9-5z" /><path d="m3 12 9 5 9-5M3 17l9 5 9-5" /></>,
  expand: <><path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5" /></>,
  more: <><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></>,
  arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
  send: <><path d="m22 2-7 20-4-9-9-4z" /><path d="M22 2 11 13" /></>,
  file: <><path d="M5 2h10l4 4v16H5z" /><path d="M15 2v5h5M8 12h8M8 16h6" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v6l4 2" /></>,
  check: <path d="m4 12 5 5L20 6" />,
  warning: <><path d="M12 3 2.8 20h18.4z" /><path d="M12 9v4M12 17h.01" /></>,
  logout: <><path d="M10 4H4v16h6M14 8l4 4-4 4M8 12h10" /></>,
  spark: <><path d="m12 2 1.3 5.1L18 9l-4.7 1.9L12 16l-1.3-5.1L6 9l4.7-1.9z" /><path d="m19 16 .6 2.4L22 19l-2.4.6L19 22l-.6-2.4L16 19l2.4-.6z" /></>,
  pin: <><path d="m8 3 8 8M14 2l8 8-3 1-4 4-1 3-8-8 3-1 4-4z" /><path d="m9 15-6 6" /></>,
  link: <><path d="M10 13a5 5 0 0 0 7.1 0l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1" /><path d="M14 11a5 5 0 0 0-7.1 0l-2 2A5 5 0 0 0 12 20.1l1.1-1.1" /></>
};
function Icon({
  name,
  size = 18
}: {
  name: IconName;
  size?: number;
}) {
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}
const Badge = ({
  children,
  tone = "blue"
}: {
  children: ReactNode;
  tone?: "blue" | "green" | "amber" | "red" | "gray";
}) => <span className={`badge badge-${tone}`}>{children}</span>;
function Login({
  onLogin
}: {
  onLogin: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [username, setUsername] = useState("demo.operator");
  const [password, setPassword] = useState("12345678");
  const [error, setError] = useState("");
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      if (!response.ok) throw new Error(response.status === 401 ? "账号或密码不正确" : "登录服务暂不可用");
      const session = await response.json();
      window.sessionStorage.setItem("airport-demo-token", session.access_token);
      onLogin();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "登录失败，请稍后重试");
    } finally {
      setBusy(false);
    }
  };
  return <main className="login-shell">
      <div className="login-bg" />
      <div className="login-wash" />
      <div className="login-brand">
        <div className="brand-mark"><span /><span /><span /></div>
        <div><strong>呼和浩特机场</strong><small>AI OPERATIONS PLATFORM</small></div>
      </div>
      <section className="login-card" aria-label="系统登录">
        <div className="login-kicker">AIRPORT OPERATIONS · 2026</div>
        <h1>呼和浩特机场<br />AI运维平台</h1>
        <p>以 BIM、知识图谱与运维智能体连接设备、图纸和经验。</p>
        <form onSubmit={submit}>
          <label>账号<input value={username} onChange={event => setUsername(event.target.value)} aria-label="账号" autoComplete="username" /></label>
          <label>密码<input type="password" value={password} onChange={event => setPassword(event.target.value)} aria-label="密码" autoComplete="current-password" /></label>
          <div className="login-options"><label className="remember"><input type="checkbox" defaultChecked />保持登录</label><button type="button" className="text-button">忘记密码</button></div>
          {error && <div className="login-error" role="alert">{error}</div>}
          <button className="primary login-button" disabled={busy}>{busy ? <><span className="spinner" />正在进入平台</> : <>登录平台<Icon name="arrow" /></>}</button>
        </form>
        <div className="login-foot"><span>Demo 环境</span><span>V1.0.0 · 内部演示</span></div>
      </section>
      <div className="login-caption"><span>HET · Hohhot Shengle International Airport</span><span>智慧机场运维总体策划 Demo</span></div>
    </main>;
}
const navItems: {
  id: Page;
  label: string;
  icon: IconName;
  no: string;
}[] = [{
  id: "home",
  label: "首页",
  icon: "grid",
  no: "00"
}, {
  id: "drawings",
  label: "图纸查询",
  icon: "drawing",
  no: "01"
}, {
  id: "graph",
  label: "知识图谱",
  icon: "graph",
  no: "02"
}, {
  id: "assistant",
  label: "运维助手",
  icon: "chat",
  no: "03"
}];
function Shell({
  page,
  setPage,
  children
}: {
  page: Page;
  setPage: (p: Page) => void;
  children: ReactNode;
}) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  const dateLabel = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`;
  const timeLabel = `${new Intl.DateTimeFormat("zh-CN", { weekday: "long" }).format(now)} · ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const titles: Record<Exclude<Page, "login">, string> = {
    home: "运维总览",
    drawings: "图纸查询",
    graph: "机电系统知识图谱",
    assistant: "运维智能助手"
  };
  return <div className="app-shell">
      <aside className="sidebar">
        <button className="side-brand" onClick={() => setPage("home")}>
          <div className="brand-mark inverse"><span /><span /><span /></div>
          <div><strong>呼和浩特机场</strong><small>AI运维平台</small></div>
        </button>
        <div className="side-label">平台导航</div>
        <nav>
          {navItems.map(item => <button key={item.id} onClick={() => setPage(item.id)} className={page === item.id ? "active" : ""}><span className="nav-no">{item.no}</span><Icon name={item.icon} /><span>{item.label}</span>{page === item.id && <i />}</button>)}
        </nav>
        <div className="side-spacer" />
        <div className="system-card">
          <div className="system-card-head"><span className="live-dot" />数据接入状态</div>
          <div><span>BIM / IFC</span><b>已连接</b></div>
          <div><span>BA / BMS</span><b className="demo-text">演示点表</b></div>
          <div><span>文档资料</span><b>5 份 / 310页</b></div>
        </div>
        <button className="side-user"><span className="avatar">WD</span><span><strong>运维管理员</strong><small>机场动力能源部</small></span><Icon name="more" /></button>
      </aside>
      <section className="main-shell">
        <header className="topbar">
          <div><span className="crumb">智慧运维 /</span><strong>{titles[page as Exclude<Page, "login">]}</strong></div>
          <div className="top-actions">
            <div className="global-search"><Icon name="search" size={16} /><span>搜索设备、空间、图纸...</span><kbd>⌘ K</kbd></div>
            <button aria-label="消息" className="icon-button"><Icon name="bell" /><em>3</em></button>
            <div className="top-time"><span>{dateLabel}</span><small>{timeLabel}</small></div>
            <button className="logout" aria-label="退出登录" onClick={() => setPage("login")}><Icon name="logout" /></button>
          </div>
        </header>
        <div className="content">{children}</div>
      </section>
    </div>;
}
function MetricCard({
  icon,
  label,
  value,
  unit,
  sub,
  tone,
  onClick
}: {
  icon: IconName;
  label: string;
  value: string;
  unit?: string;
  sub: ReactNode;
  tone: string;
  onClick?: () => void;
}) {
  return <button className="metric-card" onClick={onClick}><span className={`metric-icon ${tone}`}><Icon name={icon} /></span><span className="metric-copy"><small>{label}</small><strong>{value}<em>{unit}</em></strong><span>{sub}</span></span><Icon name="chevron" size={16} /></button>;
}
type DashboardData = {
  equipment: { total: number; running: number; fault: number };
  energy: { today_mwh: number; hvac_mwh: number; yoy_percent: number };
  alarms: { total: number; critical: number; general: number };
  work_orders: { today: number; done: number; doing: number; todo: number };
};
type HomeAlarm = {
  id: string;
  assetCode: string;
  label: string;
  space: string;
  detail: string;
  time: string;
  severity: "high" | "mid";
  ifcGlobalId: string;
};
const homeAlarms: HomeAlarm[] = [{
  id: "airflow-low",
  assetCode: "5466537",
  label: "送风口 5466537 风量不足",
  space: airflowAlarm.location,
  detail: `当前 ${airflowAlarm.currentAirflow} / 参考 ${airflowAlarm.referenceAirflow} m³/h · ${airflowDeviationPercent()}%`,
  time: "10:08",
  severity: "high",
  ifcGlobalId: airflowAlarm.ifcGlobalId
}, {
  id: "pump-current",
  assetCode: "CHWP-02",
  label: "CHWP-02 运行电流异常",
  space: "B1 冷冻机房",
  detail: "超过阈值 12% · 持续 30 分钟",
  time: "09:56",
  severity: "high",
  ifcGlobalId: "2LnU_nN4n7j8uYrOc9CFQJ"
}, {
  id: "vav-offline",
  assetCode: "VAV-L2-113",
  label: "VAV-L2-113 通信中断",
  space: "L2 候机区机电间",
  detail: "离线 32 分钟 · DI 状态丢失",
  time: "09:41",
  severity: "mid",
  ifcGlobalId: "2LnU_nN4n7j8uYrOc9C7Eq"
}, {
  id: "filter-pressure",
  assetCode: "FAF-B1-08",
  label: "FAF-B1-08 滤网压差预警",
  space: "B1 新风机房",
  detail: "压差 286 Pa · 建议维护",
  time: "09:22",
  severity: "mid",
  ifcGlobalId: "2LnU_nN4n7j8uYrOc9CFJd"
}];
function SemanticQuery({
  value,
  onChange,
  onSubmit,
  context,
  count,
  loading,
  error,
  examples
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  context: string;
  count?: number;
  loading?: boolean;
  error?: string;
  examples?: Array<{ question: string; answer: string }>;
}) {
  const [answer, setAnswer] = useState("");
  const samples = examples || [{ question: "有哪些暖通设备？", answer: `已在 ${context} 中定位空调机组、风管、风阀与末端送风设备。` }, { question: "查最新版本图纸", answer: `已筛选 ${context} 对应的当前有效图纸，可在右侧列表打开原始 PDF。` }, { question: "当前报警关联哪里？", answer: "已关联报警构件、所属系统、上游设备和服务区域。" }];
  const submit = (text: string) => {
    const normalized = text.trim();
    if (!normalized) return;
    const preset = samples.find(sample => sample.question === normalized);
    setAnswer(preset?.answer || `已结合 ${context} 的 IFC、图纸和台账数据执行查询，结果已同步到当前页面。`);
    if (!preset) onSubmit(normalized);
  };
  return <section className="semantic-query compact-query">
    <div className="semantic-head"><span className="ai-square"><Icon name="spark" /></span><div><small>语义问答查询</small><strong>基于当前空间与业务上下文</strong></div>{typeof count === "number" && <Badge tone="blue">{count} 个匹配</Badge>}</div>
    <div className="semantic-input"><input value={value} onChange={event => onChange(event.target.value)} placeholder={`询问 ${context} 的设备、系统或图纸…`} onKeyDown={event => event.key === "Enter" && submit(value)} /><button className="primary" onClick={() => submit(value)} disabled={loading || !value.trim()}><Icon name="send" />{loading ? "检索中" : "发送"}</button></div>
    <div className="semantic-samples">{samples.map(sample => <button key={sample.question} className={value === sample.question ? "active" : ""} onClick={() => { onChange(sample.question); setAnswer(""); }}>{sample.question}</button>)}{error && <Badge tone="red">{error}</Badge>}</div>
    {answer && <div className="semantic-answer" role="status"><Icon name="spark" size={15} /><span><strong>查询结果</strong>{answer}</span></div>}
  </section>;
}
function Home({ startAirflowDemo }: { startAirflowDemo: () => void }) {
  const [locatedAlarm, setLocatedAlarm] = useState<HomeAlarm>(homeAlarms[0]);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  useEffect(() => {
    fetch("/api/dashboard").then(response => response.ok ? response.json() : Promise.reject()).then(setDashboard).catch(() => setDashboard(null));
    if (!document.head.querySelector(`link[href="${IFC_MODEL_URL}"]`)) {
      const preload = document.createElement("link");
      preload.rel = "prefetch";
      preload.as = "fetch";
      preload.href = IFC_MODEL_URL;
      preload.crossOrigin = "anonymous";
      document.head.appendChild(preload);
    }
  }, []);
  const equipment = dashboard?.equipment;
  const alarms = dashboard?.alarms;
  const workOrders = dashboard?.work_orders;
  const locateAlarm = (alarm: HomeAlarm) => setLocatedAlarm(alarm);
  return <div className="page home-page">
      <div className="page-head">
        <div><h2>航站楼运维态势</h2><p>设备、空间、报警与工单的一体化运营视图</p></div>
        <div className="head-tools"><Badge tone={dashboard ? "green" : "gray"}><span className="live-dot" /> {dashboard ? "接口数据已接入" : "数据加载中"}</Badge><button className="outline"><Icon name="clock" />实时 API</button></div>
      </div>
      <div className="metric-grid">
        <MetricCard icon="activity" label="设备运行状态" value={String(equipment?.total ?? "—")} unit="台" tone="blue" sub={<><i className="good-dot" />运行 {equipment?.running ?? "—"} · 故障 <b className="red-text">{equipment?.fault ?? "—"}</b></>} />
        <MetricCard icon="alarm" label="当前报警" value={String(alarms?.total ?? "—")} unit="条" tone="red" sub={<>紧急 <b className="red-text">{alarms?.critical ?? "—"}</b> · 一般 {alarms?.general ?? "—"}</>} />
        <MetricCard icon="work" label="待办工单" value={String(workOrders?.todo ?? "—")} unit="项" tone="amber" sub={<>处理中 {workOrders?.doing ?? "—"} · 今日完成 {workOrders?.done ?? "—"}</>} />
      </div>
      <div className="home-feedback-grid">
        <section className="panel campus-panel">
          <div className="panel-head"><div><small>空间态势</small><h3>航站楼 B1 · 三维机电空间</h3></div><div className="seg"><button className="active">B1</button><button disabled title="当前 Demo 仅接入 B1 模型">L1</button><button disabled title="当前 Demo 仅接入 B1 模型">L2</button><button disabled title="当前 Demo 仅接入 B1 模型">L3</button></div></div>
          <MiniModel selectedGlobalIds={[locatedAlarm.ifcGlobalId]} selectedLabel={locatedAlarm.assetCode} title="IFC 三维模型" className="home-ifc-model" />
        </section>
        <aside className="home-right-stack">
          <section className="panel alarm-panel">
            <div className="panel-head"><div><small>事件中心</small><h3>实时报警</h3></div><button className="text-button" disabled title="Demo 仅展示当前报警摘要">查看全部 15</button></div>
            <div className="alarm-summary"><div><strong>03</strong><span>紧急报警</span></div><div><strong>12</strong><span>一般报警</span></div><div className="ring"><span>78%</span></div></div>
            <div className="alarm-list">
              {homeAlarms.map(alarm => <div key={alarm.id} className={`alarm-row ${alarm.id === "airflow-low" ? "airflow-alarm-row" : ""} ${locatedAlarm.id === alarm.id ? "selected" : ""}`}><button className="alarm-select" onClick={() => locateAlarm(alarm)} aria-label={`定位${alarm.label}`}><i className={`sev ${alarm.severity}`} /><span><strong>{alarm.label}</strong><small>{alarm.space} · {alarm.detail}</small></span><time>{alarm.time}</time><em>定位</em></button>{alarm.id === "airflow-low" && <button className="alarm-diagnose" onClick={startAirflowDemo}><Icon name="graph" size={14} />开始诊断<Icon name="arrow" size={12} /></button>}</div>)}
            </div>
          </section>
          <section className="panel work-panel">
            <div className="panel-head"><div><small>WORK ORDERS</small><h3>工单处理</h3></div><button className="text-button" disabled title="工单系统尚未接入">工单中心</button></div>
            <div className="work-body"><div className="work-donut"><div><strong>72</strong><span>今日工单</span></div></div><div className="work-legend"><span><i className="done" /><b>46</b> 已完成</span><span><i className="doing" /><b>9</b> 处理中</span><span><i className="todo" /><b>17</b> 待处理</span></div></div>
          </section>
        </aside>
      </div>
    </div>;
}
type DrawingRecord = {
  id: string;
  title: string;
  discipline: string;
  relative_path: string;
  ifc_room: boolean;
  url: string;
  version: string;
  source: string;
};
type DrawingTreeItem = { name: string; count: number; node_type?: "space" | "discipline"; highlight?: boolean; children?: DrawingTreeItem[] };
const drawingRoomOptions = [{ id: "m18", label: "T-BE-B1-M18 空调机房", count: 32, disciplines: [["建筑", 6], ["暖通", 14], ["消防", 3], ["电气", 6], ["给排水", 3]] }, { id: "chiller", label: "B1 冷冻机房", count: 18, disciplines: [["建筑", 2], ["暖通", 9], ["电气", 4], ["给排水", 3]] }, { id: "power", label: "B1 配电间", count: 11, disciplines: [["建筑", 2], ["电气", 7], ["消防", 2]] }, { id: "baggage", label: "L1 行李机房", count: 9, disciplines: [["建筑", 2], ["暖通", 3], ["电气", 4]] }, { id: "l2", label: "L2 候机区机电间", count: 7, disciplines: [["建筑", 2], ["暖通", 3], ["电气", 2]] }, { id: "fresh", label: "B1 新风机房", count: 13, disciplines: [["建筑", 2], ["暖通", 8], ["电气", 3]] }];
function DrawingPreview({
  selected,
  version,
  setVersion
}: {
  selected: DrawingRecord | null;
  version: string;
  setVersion: (s: string) => void;
}) {
  if (!selected) return <section className="drawing-canvas panel drawing-empty"><Icon name="file" size={32} /><strong>正在读取图纸目录</strong><span>图纸将由 /api/drawings 返回并在此直接预览</span></section>;
  const openOriginal = () => window.open(selected.url, "_blank", "noopener,noreferrer");
  return <section className="drawing-canvas panel">
    <div className="drawing-toolbar"><div><Badge tone="green">本地已收集</Badge><strong>{selected.id}</strong><span>{selected.title}</span></div><div><select value={version} onChange={e => setVersion(e.target.value)}><option>原始交付版</option><option>版本元数据待补录</option></select><button className="icon-button" disabled title="原始 PDF 未提供图层数据"><Icon name="layers" /></button><button className="icon-button" onClick={openOriginal} aria-label="打开原始图纸"><Icon name="expand" /></button></div></div>
    <div className="blueprint real-pdf">
      <iframe title={`${selected.title} 原始 PDF`} src={`${selected.url}#toolbar=1&navpanes=0&view=FitH`} />
      <div className="real-data-label"><span className="live-dot" />PDF 原文 · {selected.source}</div>
    </div>
  </section>;
}
function RoomServiceModal({
  onClose
}: {
  onClose: () => void;
}) {
  return <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
    <section className="data-modal room-modal" role="dialog" aria-modal="true" aria-label="房间与服务区域关联" onMouseDown={e => e.stopPropagation()}>
      <header className="modal-head"><div><div className="eyebrow">ROOM · SERVICE AREA RELATION</div><h3>房间与服务区域关联</h3><p>T-BE-B1-M18 空调机房 · 自动生成 Demo 数据</p></div><button className="modal-close" onClick={onClose}>×</button></header>
      <div className="room-facts">
        <span><small>room_id</small><strong>RM-B1-M18</strong></span>
        <span><small>room_name</small><strong>T-BE-B1-M18 空调机房</strong></span>
        <span><small>floor_id</small><strong>AR_-7.000 / B1</strong></span>
        <span><small>区域编码</small><strong>HET-T2-B1-M18</strong></span>
        <span className="wide"><small>边界</small><strong>Demo-Polygon-B1-M18 · 待由 IFC 空间边界/图纸轮廓校核</strong></span>
      </div>
      <div className="service-map">
        <div className="service-node source"><small>房间</small><strong>RM-B1-M18</strong><span>空调机房</span></div>
        <div className="service-lines"><span>SUPPLIES</span><i /><span>SERVES</span></div>
        <div className="service-zones">
          <div className="service-node zone"><small>服务区域 01</small><strong>SA-ZONE-B1-02</strong><span>B1 公共区东段 · 1,860 m²</span></div>
          <div className="service-node zone"><small>服务区域 02</small><strong>SA-ZONE-L1-05</strong><span>L1 到达厅东区 · 3,240 m²</span></div>
          <div className="service-node zone"><small>服务区域 03</small><strong>SA-ZONE-L2-03</strong><span>L2 候机区中段 · 2,780 m²</span></div>
        </div>
      </div>
      <div className="relation-summary"><div><span className="relation-num">01</span><span><strong>AHU-0B2-04</strong><small>主要服务设备 · SA 94 / RA 93 / FA 58</small></span><Badge tone="blue">IFC 已关联</Badge></div><div><span className="relation-num">03</span><span><strong>服务区域</strong><small>根据送回风系统拓扑自动生成，待人工确认</small></span><Badge tone="amber">Demo</Badge></div></div>
      <footer className="modal-foot"><span><i className="live-dot" />当前展示已写入知识图谱的关系：ROOM — SERVED_BY — ASSET — SERVES — ZONE</span><button className="outline" onClick={onClose}>关闭</button><button className="primary" disabled title="Demo 环境为只读">Demo 只读</button></footer>
    </section>
  </div>;
}
function DataLedgerModal({
  onClose
}: {
  onClose: () => void;
}) {
  const [ledgerTab, setLedgerTab] = useState<"rooms" | "assets" | "points">("assets");
  const [rooms, setRooms] = useState<Array<Record<string, any>>>([]);
  const [assets, setAssets] = useState<Array<Record<string, any>>>([]);
  const [assetTotal, setAssetTotal] = useState(0);
  const [points, setPoints] = useState<Array<Record<string, any>>>([]);
  const [loadError, setLoadError] = useState("");
  useEffect(() => {
    let active = true;
    Promise.all([
      fetch("/api/rooms").then(result => result.ok ? result.json() : Promise.reject(new Error("房间数据加载失败"))),
      fetch("/api/assets?limit=1000").then(result => result.ok ? result.json() : Promise.reject(new Error("设备台账加载失败"))),
      fetch("/api/points").then(result => result.ok ? result.json() : Promise.reject(new Error("点表加载失败")))
    ]).then(([roomData, assetData, pointData]) => {
      if (!active) return;
      setRooms(roomData);
      setAssets(assetData.items || []);
      setAssetTotal(assetData.total || 0);
      setPoints(pointData);
    }).catch(reason => {
      if (active) setLoadError(reason instanceof Error ? reason.message : "数据加载失败");
    });
    return () => {
      active = false;
    };
  }, []);
  const exportLedger = () => {
    const rows = ledgerTab === "rooms" ? rooms : ledgerTab === "assets" ? assets : points;
    if (!rows.length) return;
    const columns = Object.keys(rows[0]);
    const quote = (value: unknown) => `"${(typeof value === "object" ? JSON.stringify(value) : String(value ?? "")).replaceAll('"', '""')}"`;
    const csv = `\uFEFF${columns.map(quote).join(",")}\n${rows.map(row => columns.map(column => quote(row[column])).join(",")).join("\n")}`;
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `airport-${ledgerTab}-ledger.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };
  return <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
    <section className="data-modal ledger-modal" role="dialog" aria-modal="true" aria-label="知识图谱数据台账" onMouseDown={e => e.stopPropagation()}>
      <header className="modal-head"><div><div className="eyebrow">KNOWLEDGE GRAPH · DATA LEDGER</div><h3>知识图谱数据台账</h3><p>IFC 实体数据与自动生成 Demo 数据的统一校核入口</p></div><button className="modal-close" onClick={onClose}>×</button></header>
      <div className="ledger-tabs">
        <button className={ledgerTab === "rooms" ? "active" : ""} onClick={() => setLedgerTab("rooms")}>房间与服务区域 <b>{rooms.length || 1}</b></button>
        <button className={ledgerTab === "assets" ? "active" : ""} onClick={() => setLedgerTab("assets")}>设备台账 <b>{assetTotal || "…"}</b></button>
        <button className={ledgerTab === "points" ? "active" : ""} onClick={() => setLedgerTab("points")}>BA/BMS 点表 <b>{points.length || 7}</b></button>
      </div>
      {loadError && <div className="ledger-error" role="alert">{loadError}</div>}
      {ledgerTab === "rooms" && <div className="ledger-table room-ledger"><div className="ledger-header"><span>room_id</span><span>room_name</span><span>floor_id</span><span>边界</span><span>区域编码</span></div>{(rooms.length ? rooms : [{ room_id: "RM-B1-M18", room_name: "T-BE-B1-M18 空调机房", floor_id: "AR_-7.000", boundary: { code: "Demo-Polygon-B1-M18" }, zone_code: "HET-T2-B1-M18" }]).slice(0, 100).map(room => <div key={room.room_id}><code>{room.room_id}</code><strong>{room.room_name}</strong><span>{room.floor_id}</span><span>{room.boundary?.code || room.boundary?.type || "待校核"}</span><code>{room.zone_code || "—"}</code></div>)}</div>}
      {ledgerTab === "assets" && <div className="ledger-table asset-ledger"><div className="ledger-header"><span>asset_code</span><span>IFC GlobalId / Revit ID</span><span>型号 / 厂家 / 序列号</span><span>安装位置</span><span>所属系统</span><span>服务范围</span></div>
        {(assets.length ? assets : [{ asset_code: "AHU-0B2-04", ifc_global_id: "加载中", model: "待补录", manufacturer: "待补录", serial_number: "待补录", location: "B1 · M18空调机房", system: "SA 94 / RA 93 / FA 58", service_scope: "B1东段、L1到达厅、L2候机区" }]).map(asset => <div key={asset.asset_code}><code>{asset.asset_code}</code><strong>{asset.ifc_global_id}{asset.revit_id ? ` / ${asset.revit_id}` : ""}</strong><span>{asset.model || "待补录"} / {asset.manufacturer || "待补录"} / {asset.serial_number || "待补录"}</span><span>{asset.location || "待确认"}</span><span>{asset.system || "待确认"}</span><span>{asset.service_scope || "待确认"}</span></div>)}
      </div>}
      {ledgerTab === "points" && <div className="ledger-table point-ledger"><div className="ledger-header"><span>point_code</span><span>asset_code</span><span>类型</span><span>单位</span><span>控制器 / 地址</span><span>报警规则</span></div>{points.map(point => <div key={point.point_code}><code>{point.point_code}</code><strong>{point.asset_code}</strong><Badge tone="blue">{point.io_type}</Badge><span>{point.unit}</span><span>{point.controller} / {point.address}</span><span>{point.alarm_rule}</span></div>)}</div>}
      <footer className="modal-foot"><span><Badge tone="amber">数据分级</Badge> IFC 字段来自模型解析；区域、编码和 BA/BMS 点位为自动生成 Demo，待实施阶段校核。</span><button className="outline" onClick={onClose}>关闭</button><button className="primary" onClick={exportLedger} disabled={!(ledgerTab === "rooms" ? rooms : ledgerTab === "assets" ? assets : points).length}>导出校核清单</button></footer>
    </section>
  </div>;
}
function Drawings({
  goGraph
}: {
  goGraph: () => void;
}) {
  const [catalog, setCatalog] = useState<DrawingRecord[]>([]);
  const [records, setRecords] = useState<DrawingRecord[]>([]);
  const [tree, setTree] = useState<DrawingTreeItem[]>([]);
  const [total, setTotal] = useState(0);
  const [selectedId, setSelectedId] = useState("");
  const [discipline, setDiscipline] = useState("全部专业");
  const [query, setQuery] = useState("T-BE-B1-M18 空调机房 风管平面");
  const [version, setVersion] = useState("原始交付版");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState("m18");
  const [openRooms, setOpenRooms] = useState<Set<string>>(new Set(["m18"]));
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const requestSequence = useRef(0);
  const applyRecords = (items: DrawingRecord[]) => {
    setRecords(items);
    setSelectedId(current => items.some(item => item.id === current) ? current : items[0]?.id || "");
  };
  const loadDrawings = (search = "M18") => {
    const requestId = ++requestSequence.current;
    setLoading(true);
    setLoadError("");
    fetch(`/api/drawings?q=${encodeURIComponent(search)}`).then(response => response.ok ? response.json() : Promise.reject(new Error("图纸目录加载失败"))).then(data => {
      if (requestId !== requestSequence.current) return;
      const items = data.items as DrawingRecord[];
      applyRecords(items);
      setDiscipline("全部专业");
    }).catch(reason => {
      if (requestId === requestSequence.current) setLoadError(reason instanceof Error ? reason.message : "图纸目录加载失败");
    }).finally(() => {
      if (requestId === requestSequence.current) setLoading(false);
    });
  };
  useEffect(() => {
    const requestId = ++requestSequence.current;
    setLoading(true);
    Promise.all([
      fetch("/api/drawings").then(response => response.ok ? response.json() : Promise.reject(new Error("完整图纸目录加载失败"))),
      fetch("/api/drawings?q=M18").then(response => response.ok ? response.json() : Promise.reject(new Error("机房图纸加载失败")))
    ]).then(([allData, roomData]) => {
      if (requestId !== requestSequence.current) return;
      const allItems = allData.items as DrawingRecord[];
      setCatalog(allItems);
      setTree(allData.tree || []);
      setTotal(allData.total || allItems.length);
      applyRecords(roomData.items as DrawingRecord[]);
    }).catch(reason => {
      if (requestId === requestSequence.current) setLoadError(reason instanceof Error ? reason.message : "图纸目录加载失败");
    }).finally(() => {
      if (requestId === requestSequence.current) setLoading(false);
    });
  }, []);
  const showDiscipline = (name: string) => {
    requestSequence.current += 1;
    setLoading(false);
    setLoadError("");
    const items = filterCatalogByDiscipline(catalog, name);
    setDiscipline(name);
    setQuery(name === "全部专业" ? "全部图纸" : `${name}专业图纸`);
    applyRecords(items);
  };
  const showRoomDrawings = (name: string) => {
    requestSequence.current += 1;
    setLoading(false);
    setLoadError("");
    setDiscipline("全部专业");
    setQuery(`${name}全部图纸`);
    applyRecords(catalog);
  };
  const visibleRecords = records;
  const selected = records.find(d => d.id === selectedId) || records[0] || null;
  const disciplineTree = useMemo(() => tree.flatMap(item => item.node_type === "space" ? item.children || [] : [item]), [tree]);
  const disciplineCounts = useMemo(() => Object.fromEntries(disciplineTree.map(item => [item.name, item.count])), [disciplineTree]);
  const selectedRoom = drawingRoomOptions.find(room => room.id === selectedRoomId) || drawingRoomOptions[0];
  const toggleRoom = (roomId: string) => setOpenRooms(current => {
    const next = new Set(current);
    if (next.has(roomId)) next.delete(roomId); else next.add(roomId);
    return next;
  });
  const drawingExamples = [{ question: "这个机房有哪些暖通图纸？", answer: `当前目录共收集 14 份暖通图纸，其中 9 份与 T-BE-B1-M18 空调机房直接关联。` }, { question: "查找风管平面图", answer: "已定位《T-BE-B1-M18空调机房风管平面1》《风管平面2》和《通风风管平面图》。" }, { question: "哪张图纸与 IFC 机房关联？", answer: "右侧带 IFC 关联标识的 9 份图纸均已关联当前空调机房，可点击任意条目预览 PDF 原文。" }];
  return <><div className="page drawing-page">
    <div className="page-head compact"><div><h2>图纸查询与模型联动</h2><p>按空间组织专业图纸，在三维模型中定位并通过语义问答检索</p></div><div className="head-tools"><Badge tone="green"><span className="live-dot" />已收集 {total} 份图纸</Badge><button className="primary small" onClick={goGraph}><Icon name="link" />定位到知识图谱</button></div></div>
    <div className="feedback-three-column drawings-feedback">
      <aside className="panel tree-panel feedback-tree">
        <div className="panel-head"><div><small>空间 / 专业</small><h3>机场空间目录</h3></div><Badge tone="amber">IFC 联动</Badge></div>
        <div className="tree-search"><Icon name="search" size={15} /><span>筛选目录</span></div>
        <div className="tree drawing-tree">
          <button className="open" onClick={() => showDiscipline("全部专业")}><Icon name="chevron" size={14} /><Icon name="building" size={16} />机场图纸主目录 <b>{total}</b></button>
          <div><button className="open" onClick={() => showDiscipline("全部专业")}><Icon name="chevron" size={14} />T2 航站楼 / B1</button>
            <div>{drawingRoomOptions.map(room => <div className={`room-tree-branch ${selectedRoomId === room.id ? "active" : ""}`} key={room.id}><button className={room.id === "m18" ? "ifc-linked" : "demo-room"} onClick={() => { toggleRoom(room.id); if (room.id === "m18") { setSelectedRoomId(room.id); showRoomDrawings(room.label); } }}><span className={openRooms.has(room.id) ? "tree-chevron open" : "tree-chevron"}>›</span><Icon name="pin" size={14} /><span>{room.label}</span>{room.id === "m18" ? <Badge tone="amber">IFC</Badge> : <Badge tone="gray">示意</Badge>}<b>{room.id === "m18" ? total : room.count}</b></button>{openRooms.has(room.id) && <div className="room-disciplines">{room.disciplines.map(([name, count]) => <button key={String(name)} className={room.id === "m18" && discipline === name ? "selected" : ""} onClick={() => { if (room.id === "m18") showDiscipline(String(name)); }}><Icon name="chevron" size={12} /><span>{name}</span><b>{count}</b></button>)}</div>}</div>)}</div>
          </div>
        </div>
        <div className="discipline-list"><small>专业筛选</small>{["全部专业", ...disciplineTree.map(item => item.name)].map(x => <button key={x} className={discipline === x ? "active" : ""} onClick={() => showDiscipline(x)}><span>{x}</span><b>{x === "全部专业" ? total : disciplineCounts[x] || 0}</b></button>)}</div>
      </aside>
      <main className="panel feedback-center drawing-center-feedback">
        <MiniModel selectedGlobalIds={selectedRoomId === "m18" && selected?.ifc_room ? ["3nUg2jPlz76PUi_3jscap4"] : []} selectedLabel={selectedRoom.label} title="IFC 三维模型" className="drawing-ifc-model" />
        <SemanticQuery value={query} onChange={setQuery} onSubmit={loadDrawings} context={selectedRoom.label} count={records.length} loading={loading} error={loadError} examples={drawingExamples} />
      </main>
      <aside className="panel result-panel feedback-results">
        <div className="panel-head"><div><small>选中空间对应图纸</small><h3>{discipline === "全部专业" ? "T-BE-B1-M18 空调机房" : `${discipline}专业`}</h3></div><Badge tone="blue">{visibleRecords.length} 份</Badge></div>
        <div className="result-filter"><span>相关度排序</span><span>当前有效版本</span></div>
        <div className="drawing-results">{visibleRecords.map((d, i) => <button key={d.id} className={selectedId === d.id ? "selected" : ""} onClick={() => {
            setSelectedId(d.id);
            setVersion("原始交付版");
            setPreviewOpen(true);
          }}><span className="doc-index">{String(i + 1).padStart(2, "0")}</span><span><strong>{d.title}</strong><small>{d.id}</small><span><Badge tone={d.ifc_room ? "amber" : "blue"}>{d.discipline}</Badge><em>{d.version}</em></span></span>{selectedId === d.id && <i />}</button>)}</div>
        <div className="version-note"><Icon name="clock" /><span><strong>版本字段待补录</strong><small>当前文件夹未提供版本号、来源和发布日期，实施阶段从图档系统同步。</small></span></div>
        <button className="primary drawing-preview-entry" onClick={() => setPreviewOpen(true)} disabled={!selected}><Icon name="file" />打开选中图纸预览</button>
      </aside>
    </div>
  </div>{previewOpen && <div className="drawing-preview-backdrop" role="presentation" onMouseDown={() => setPreviewOpen(false)}><section className="drawing-preview-shell" role="dialog" aria-modal="true" aria-label="图纸预览" onMouseDown={event => event.stopPropagation()}><header><div><small>DRAWING PREVIEW</small><strong>{selected?.title || "图纸预览"}</strong></div><button onClick={() => setPreviewOpen(false)} aria-label="关闭图纸预览">×</button></header><DrawingPreview selected={selected} version={version} setVersion={setVersion} /><footer><span>PDF 原文 · 当前有效版本</span><button onClick={() => setPreviewOpen(false)}>关闭预览</button></footer></section></div>}</>;
}
const graphNodes = [{
  id: "ahu",
  label: "AHU-0B2-04",
  kind: "空调机组",
  x: 340,
  y: 180,
  tone: "primary"
}, {
  id: "fa",
  label: "FA 58",
  kind: "新风系统",
  x: 85,
  y: 90,
  tone: "air"
}, {
  id: "ra",
  label: "RA 93",
  kind: "回风系统",
  x: 85,
  y: 270,
  tone: "air"
}, {
  id: "sa",
  label: "SA 94",
  kind: "送风系统",
  x: 520,
  y: 78,
  tone: "air"
}, {
  id: "room",
  label: "RM-B1-M18",
  kind: "空间",
  x: 520,
  y: 238,
  tone: "space"
}, {
  id: "chw",
  label: "CHR1",
  kind: "冷冻水回路",
  x: 335,
  y: 340,
  tone: "water"
}, {
  id: "damper",
  label: "风阀-D04",
  kind: "调节阀",
  x: 95,
  y: 385,
  tone: "device"
}, {
  id: "sensor",
  label: "SAT-04",
  kind: "温度点位",
  x: 520,
  y: 398,
  tone: "sensor"
}, {
  id: "zone1",
  label: "B1东段",
  kind: "服务区域",
  x: 690,
  y: 142,
  tone: "zone"
}, {
  id: "zone2",
  label: "L1到达厅",
  kind: "服务区域",
  x: 690,
  y: 238,
  tone: "zone"
}, {
  id: "zone3",
  label: "L2候机区",
  kind: "服务区域",
  x: 690,
  y: 334,
  tone: "zone"
}];
type ModelMeshRecord = { mesh: THREE.Mesh; globalId: string; originalMaterial: THREE.Material | THREE.Material[] };
function MiniModel({
  selectedGlobalIds,
  selectedLabel,
  title = "IFC 模型",
  className = ""
}: {
  selectedGlobalIds: string[];
  selectedLabel: string;
  title?: string;
  className?: string;
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const resetRef = useRef<() => void>(() => undefined);
  const applySelectionRef = useRef<(globalIds: string[]) => void>(() => undefined);
  const materialsRef = useRef<THREE.Material[]>([]);
  const selectedGuidsRef = useRef(selectedGlobalIds);
  const wireframeRef = useRef(false);
  const [progress, setProgress] = useState(0);
  const [modelError, setModelError] = useState("");
  const [wireframe, setWireframe] = useState(false);
  const [isolatedCount, setIsolatedCount] = useState(0);
  const [stats, setStats] = useState({ renderedElements: 0, triangles: 0, ifcProducts: 0 });
  selectedGuidsRef.current = selectedGlobalIds;
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f4f5);
    const camera = new THREE.PerspectiveCamera(38, 1, 0.01, 10000);
    let renderer: THREE.WebGLRenderer;
    const probe = document.createElement("canvas");
    if (!probe.getContext("webgl2") && !probe.getContext("webgl")) {
      setProgress(100);
      setModelError("当前浏览器未启用 WebGL；知识图谱仍可使用，请启用硬件加速查看 IFC 三维模型");
      return;
    }
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true });
    } catch {
      setProgress(100);
      setModelError("当前浏览器未启用 WebGL；知识图谱仍可使用，请启用硬件加速查看 IFC 三维模型");
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    mount.appendChild(renderer.domElement);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    scene.add(new THREE.HemisphereLight(0xffffff, 0x52616a, 2.2));
    const keyLight = new THREE.DirectionalLight(0xffffff, 3.2);
    keyLight.position.set(40, 60, 80);
    scene.add(keyLight);
    const grid = new THREE.GridHelper(200, 40, 0xa6b7be, 0xd8e1e4);
    scene.add(grid);
    let model: THREE.Object3D | null = null;
    let modelMeshes: ModelMeshRecord[] = [];
    const originalMaterials: THREE.Material[] = [];
    let highlightHelpers: THREE.BoxHelper[] = [];
    let selectionMaterials: THREE.Material[] = [];
    const fitBox = (box: THREE.Box3) => {
      if (box.isEmpty()) return;
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      const radius = Math.max(size.x, size.y, size.z) * 0.9;
      if (!Number.isFinite(radius) || radius <= 0) return;
      controls.target.copy(center);
      camera.position.copy(center).add(new THREE.Vector3(radius, radius * 0.72, radius));
      camera.near = Math.max(radius / 1000, 0.0000001);
      camera.far = Math.max(radius * 100, 1);
      camera.updateProjectionMatrix();
      controls.update();
    };
    const fitObjects = (targets: THREE.Object3D[]) => {
      const box = new THREE.Box3();
      targets.forEach(target => {
        target.updateMatrixWorld(true);
        box.expandByObject(target);
      });
      fitBox(box);
    };
    const fitView = () => {
      if (model) fitObjects([model]);
    };
    const clearHighlight = () => {
      modelMeshes.forEach(record => {
        record.mesh.material = record.originalMaterial;
        record.mesh.visible = true;
      });
      highlightHelpers.forEach(helper => {
        scene.remove(helper);
        helper.geometry.dispose();
        helper.material.dispose();
      });
      highlightHelpers = [];
      selectionMaterials.forEach(material => material.dispose());
      selectionMaterials = [];
      materialsRef.current = originalMaterials;
    };
    const applySelection = (globalIds: string[]) => {
      if (!model) return;
      clearHighlight();
      const wanted = new Set(globalIds.filter(Boolean));
      const targets = modelMeshes.filter(record => wanted.has(record.globalId));
      if (!targets.length) {
        grid.visible = true;
        setIsolatedCount(0);
        fitView();
        return;
      }
      const targetIds = new Set(targets.map(target => target.globalId));
      const dimMaterial = new THREE.MeshStandardMaterial({
        color: 0xaab5ba,
        transparent: true,
        opacity: 0.1,
        depthWrite: false,
        side: THREE.DoubleSide,
        wireframe: wireframeRef.current
      });
      selectionMaterials.push(dimMaterial);
      const highlightMaterial = (material: THREE.Material) => {
        const clone = material.clone();
        if (clone instanceof THREE.MeshStandardMaterial) {
          clone.color.set(0xffc15a);
          clone.emissive.set(0x7a4300);
          clone.emissiveIntensity = 0.36;
        }
        clone.transparent = false;
        clone.opacity = 1;
        clone.depthWrite = true;
        if ("wireframe" in clone) (clone as THREE.MeshStandardMaterial).wireframe = wireframeRef.current;
        selectionMaterials.push(clone);
        return clone;
      };
      modelMeshes.forEach(record => {
        if (!targetIds.has(record.globalId)) {
          record.mesh.material = dimMaterial;
          return;
        }
        record.mesh.material = Array.isArray(record.originalMaterial)
          ? record.originalMaterial.map(highlightMaterial)
          : highlightMaterial(record.originalMaterial);
      });
      model.updateMatrixWorld(true);
      targets.forEach(target => {
        const helper = new THREE.BoxHelper(target.mesh, 0xffa928);
        highlightHelpers.push(helper);
        scene.add(helper);
      });
      materialsRef.current = [...originalMaterials, ...selectionMaterials];
      grid.visible = false;
      setIsolatedCount(targets.length);
      fitObjects(targets.map(target => target.mesh));
    };
    applySelectionRef.current = applySelection;
    resetRef.current = () => applySelection(selectedGuidsRef.current);
    new GLTFLoader().load(IFC_MODEL_URL, gltf => {
      model = gltf.scene;
      model.rotation.x = -Math.PI / 2;
      model.traverse(object => {
        if (!(object instanceof THREE.Mesh)) return;
        if (!object.geometry.getAttribute("normal")) object.geometry.computeVertexNormals();
        const originalMaterial = object.material;
        const objectMaterials = Array.isArray(originalMaterial) ? originalMaterial : [originalMaterial];
        originalMaterials.push(...objectMaterials);
        modelMeshes.push({ mesh: object, globalId: String(object.userData.ifcGlobalId || ""), originalMaterial });
        object.castShadow = false;
        object.receiveShadow = true;
      });
      scene.add(model);
      const gltfNodes = gltf.parser.json.nodes as Array<{ extras?: Record<string, unknown> }> | undefined;
      const metadata = gltfNodes?.find(node => node.extras?.renderedElements)?.extras || {};
      setStats({
        renderedElements: Number(metadata.renderedElements || 0),
        triangles: Number(metadata.triangles || 0),
        ifcProducts: Number(metadata.ifcProducts || 0)
      });
      materialsRef.current = originalMaterials;
      setProgress(100);
      applySelection(selectedGuidsRef.current);
    }, event => {
      if (event.total) setProgress(Math.round(event.loaded / event.total * 100));
    }, () => setModelError("IFC 模型加载失败，请检查 GLB 构建产物"));
    const resize = () => {
      const width = mount.clientWidth;
      const height = mount.clientHeight;
      if (!width || !height) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(mount);
    resize();
    let frame = 0;
    const animate = () => {
      frame = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      clearHighlight();
      controls.dispose();
      renderer.dispose();
      materialsRef.current = [];
      mount.replaceChildren();
    };
  }, []);
  const selectionKey = selectedGlobalIds.join("|");
  useEffect(() => applySelectionRef.current(selectedGuidsRef.current), [selectionKey]);
  return <div className={`model-view ${className}`}>
    <div className="model-title"><span><i className="live-dot" />{title}</span><div>{selectedGlobalIds.length > 0 && <Badge tone={isolatedCount ? "amber" : "gray"}>{isolatedCount ? `已隔离 ${selectedLabel} · ${isolatedCount}个构件` : "正在定位几何"}</Badge>}<Badge tone="green">IFC2X3 · GLB</Badge></div></div>
    <div ref={mountRef} className="model-webgl" aria-label="IFC 三维模型查看器" />
    {progress < 100 && !modelError && <div className="model-loading"><span className="spinner" />正在加载 IFC 几何 {progress}%</div>}
    {modelError && <div className="model-loading model-error"><Icon name="warning" />{modelError}</div>}
    <div className="model-controls"><button onClick={() => resetRef.current()} aria-label="重置视角">◎</button><button className={wireframe ? "mini-active" : ""} onClick={() => setWireframe(current => {
      const next = !current;
      wireframeRef.current = next;
      materialsRef.current.forEach(material => {
        if ("wireframe" in material) (material as THREE.MeshStandardMaterial).wireframe = next;
      });
      return next;
    })} aria-label="切换线框模式"><Icon name="layers" size={15} /></button><button className="mini-active" aria-label="三维模式">3D</button></div>
    <div className="model-stats"><span><b>{stats.renderedElements || "…"}</b> 几何构件</span><span><b>{stats.ifcProducts || "…"}</b> IFC对象</span><span><b>{stats.triangles ? stats.triangles.toLocaleString() : "…"}</b> 三角面</span></div>
  </div>;
}
type GraphApiNode = { id: string; label: string; kind: string; ifc_class?: string; properties?: Record<string, unknown> };
type GraphApiEdge = { source: string; target: string; type: string; source_kind?: string };
type PositionedGraphNode = GraphApiNode & { x: number; y: number; tone: string };
type AssetRecord = { asset_code: string; name: string; ifc_global_id: string; ifc_class: string; system: string; location: string };
type GraphData = {
  meta: { ifc_schema: string; ifc_product_count: number; asset_count: number; room_count: number; point_count: number; service_area_count: number };
  nodes: GraphApiNode[];
  edges: GraphApiEdge[];
};
const airflowDemoGeometryIds = [airflowAlarm.ifcGlobalId, "2LnU_nN4n7j8uYrOc9CFPy", "3nUg2jPlz76PUi_3jscap4"];
function withAirflowDemoOverlay(data: GraphData, alarm: AirflowAlarmContext): GraphData {
  const extraNodes: GraphApiNode[] = [{
    id: `alarm:${alarm.alarmId}`,
    label: "风量不足",
    kind: "报警",
    properties: { alarm_id: alarm.alarmId, current_airflow: `${alarm.currentAirflow} m³/h`, reference_airflow: `${alarm.referenceAirflow} m³/h`, source: "BA/BMS 演示点" }
  }, {
    id: "system:SA 94",
    label: "SA 94",
    kind: "系统",
    properties: { system_name: "SA 94", data_status: "Demo补充关系，待实施校核" }
  }, {
    id: "asset:AHU-0B2-04",
    label: "AHU-0B2-04",
    kind: "设备",
    ifc_class: "IfcBuildingElementProxy",
    properties: { asset_code: "AHU-0B2-04", ifc_global_id: "3nUg2jPlz76PUi_3jscap4", location: "RM-B1-M18 / T-BE-B1-M18空调机房", system: "SA 94 / RA 93 / FA 58", data_status: "IFC实体；当前系统路径为Demo补充" }
  }];
  const nodes = [...data.nodes];
  extraNodes.forEach(node => {
    if (!nodes.some(current => current.id === node.id)) nodes.push(node);
  });
  const extraEdges: GraphApiEdge[] = [{ source: `alarm:${alarm.alarmId}`, target: `asset:${alarm.assetCode}`, type: "TRIGGERED_ON", source_kind: "demo:bms" }, { source: "asset:5466492", target: "system:SA 94", type: "PART_OF_SYSTEM", source_kind: "demo:semantic" }, { source: "system:SA 94", target: "asset:AHU-0B2-04", type: "SUPPLIED_BY", source_kind: "demo:semantic" }];
  const edges = [...data.edges];
  extraEdges.forEach(edge => {
    if (!edges.some(current => current.source === edge.source && current.target === edge.target && current.type === edge.type)) edges.push(edge);
  });
  return { ...data, nodes, edges };
}
function KnowledgeGraph({ demoAlarm, goAssistant }: { demoAlarm: AirflowAlarmContext | null; goAssistant: () => void }) {
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [assets, setAssets] = useState<AssetRecord[]>([]);
  const initialFocus = demoAlarm?.assetCode || "AHU-0B2-04";
  const [selected, setSelected] = useState(`asset:${initialFocus}`);
  const [focusId, setFocusId] = useState(`asset:${initialFocus}`);
  const [currentFocus, setCurrentFocus] = useState(initialFocus);
  const [assetQuery, setAssetQuery] = useState("");
  const [semanticQuery, setSemanticQuery] = useState("");
  const [openAssetGroups, setOpenAssetGroups] = useState<Set<string>>(new Set([demoAlarm ? "末端设备" : "空调机组"]));
  const [modelGroup, setModelGroup] = useState<{ name: string; label: string; globalIds?: string[]; systemName?: string } | null>(null);
  const [nodeOverrides, setNodeOverrides] = useState<Record<string, { x: number; y: number }>>({});
  const [tab, setTab] = useState<"props" | "points" | "relations">("props");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [showLedger, setShowLedger] = useState(false);
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [graphMode, setGraphMode] = useState<"system" | "semantic">("system");
  const [graphDepth, setGraphDepth] = useState(1);
  const [graphZoom, setGraphZoom] = useState(1);
  const [graphPan, setGraphPan] = useState({ x: 0, y: 0 });
  const [visibleKinds, setVisibleKinds] = useState<Record<string, boolean>>({ "设备": true, "系统": true, "空间": true, "服务区域": true, "点位": true, "报警": true });
  const graphPanelRef = useRef<HTMLElement>(null);
  const graphSvgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<{ id: string; pointerId: number; offsetX: number; offsetY: number } | null>(null);
  const panRef = useRef<{ pointerId: number; startX: number; startY: number; originX: number; originY: number } | null>(null);
  const loadGraph = (focus: string, hops = graphDepth) => {
    const normalized = focus.trim() || "AHU-0B2-04";
    setGraphPan({ x: 0, y: 0 });
    fetch(`/api/graph?focus=${encodeURIComponent(normalized)}&hops=${hops}`).then(response => response.ok ? response.json() : Promise.reject()).then((data: GraphData) => {
      const nextData = demoAlarm ? withAirflowDemoOverlay(data, demoAlarm) : data;
      setGraphData(nextData);
      setCurrentFocus(normalized);
      setModelGroup(null);
      const focusNode = nextData.nodes.find(node => node.label === normalized || node.id.endsWith(`:${normalized}`)) || nextData.nodes[0];
      if (focusNode) {
        setSelected(focusNode.id);
        setFocusId(focusNode.id);
        setNodeOverrides({});
      }
    }).catch(() => setGraphData(null));
  };
  useEffect(() => {
    loadGraph(initialFocus);
    fetch("/api/assets?limit=2000").then(response => response.ok ? response.json() : Promise.reject()).then(data => setAssets(data.items || [])).catch(() => setAssets([]));
  }, []);
  const baseGraphNodes = useMemo<PositionedGraphNode[]>(() => graphData ? layoutGraph(graphData.nodes, graphData.edges, focusId) : [], [graphData, focusId]);
  const graphNodes = useMemo<PositionedGraphNode[]>(() => baseGraphNodes.map(node => ({ ...node, ...(nodeOverrides[node.id] || {}) })), [baseGraphNodes, nodeOverrides]);
  const filteredAssets = useMemo(() => {
    const normalized = assetQuery.trim().toLocaleLowerCase();
    if (!normalized) return assets;
    return assets.filter(asset => `${asset.asset_code} ${asset.name} ${asset.ifc_class} ${asset.system} ${asset.location}`.toLocaleLowerCase().includes(normalized));
  }, [assetQuery, assets]);
  const assetGroups = useMemo(() => groupAssets(filteredAssets), [filteredAssets]);
  const nodeById = useMemo(() => new Map(graphNodes.map(node => [node.id, node])), [graphNodes]);
  const kindKey = (kind: string) => kind === "空间" || kind === "房间" ? "空间" : kind === "设备类型" ? "设备" : kind;
  const visibleGraphNodes = graphNodes.filter(node => visibleKinds[kindKey(node.kind)] !== false);
  const visibleNodeIds = new Set(visibleGraphNodes.map(node => node.id));
  const visibleEdges = (graphData?.edges || []).filter(edge => visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target) && (graphMode === "system" ? edge.type !== "INSTANCE_OF" : ["SERVES", "SUPPLIES", "LOCATED_IN", "INSTANCE_OF"].includes(edge.type)));
  const selectedNode = graphNodes.find(n => n.id === selected) || graphNodes[0];
  useEffect(() => {
    const svg = graphSvgRef.current;
    if (!svg) return;
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      setGraphZoom(current => Math.max(.5, Math.min(2, current + (event.deltaY < 0 ? .12 : -.12))));
    };
    svg.addEventListener("wheel", handleWheel, { passive: false });
    return () => svg.removeEventListener("wheel", handleWheel);
  }, [Boolean(selectedNode)]);
  const incidentEdges = graphData?.edges.filter(edge => edge.source === selected || edge.target === selected) || [];
  const pointNodes = graphData?.nodes.filter(node => node.kind === "点位") || [];
  const selectGraphNode = (id: string) => {
    setSelected(id);
    const node = nodeById.get(id);
    if (node?.kind === "系统") {
      setModelGroup({
        name: node.label,
        label: `${node.label} 系统`,
        systemName: node.label,
        globalIds: demoAlarm && node.label === "SA 94" ? airflowDemoGeometryIds : undefined
      });
    } else {
      setModelGroup(null);
    }
    if (node?.kind === "设备" || node?.kind === "房间" || node?.kind === "服务区域") setTab("relations");
  };
  const isolateAssetGroup = (name: string, items: AssetRecord[]) => {
    setOpenAssetGroups(current => new Set(current).add(name));
    setModelGroup({ name, label: `${name}（${items.length}台）`, globalIds: assetGlobalIds(items) });
  };
  const graphPoint = (event: ReactPointerEvent<SVGSVGElement | SVGGElement>) => {
    const rect = graphSvgRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    const rawX = (event.clientX - rect.left) / rect.width * 760;
    const rawY = (event.clientY - rect.top) / rect.height * 520;
    return { x: 380 + (rawX - graphPan.x - 380) / graphZoom, y: 260 + (rawY - graphPan.y - 260) / graphZoom };
  };
  const beginNodeDrag = (event: ReactPointerEvent<SVGGElement>, node: PositionedGraphNode) => {
    event.preventDefault();
    const point = graphPoint(event);
    dragRef.current = { id: node.id, pointerId: event.pointerId, offsetX: point.x - node.x, offsetY: point.y - node.y };
    event.currentTarget.setPointerCapture(event.pointerId);
    selectGraphNode(node.id);
  };
  const beginGraphPan = (event: ReactPointerEvent<SVGRectElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    panRef.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, originX: graphPan.x, originY: graphPan.y };
    graphSvgRef.current?.setPointerCapture(event.pointerId);
  };
  const moveGraphPointer = (event: ReactPointerEvent<SVGSVGElement>) => {
    const dragging = dragRef.current;
    if (dragging) {
      const point = graphPoint(event);
      setNodeOverrides(current => ({ ...current, [dragging.id]: { x: Math.max(62, Math.min(698, point.x - dragging.offsetX)), y: Math.max(38, Math.min(482, point.y - dragging.offsetY)) } }));
      return;
    }
    const panning = panRef.current;
    const rect = graphSvgRef.current?.getBoundingClientRect();
    if (!panning || !rect) return;
    setGraphPan({ x: Math.max(-520, Math.min(520, panning.originX + (event.clientX - panning.startX) * 760 / rect.width)), y: Math.max(-360, Math.min(360, panning.originY + (event.clientY - panning.startY) * 520 / rect.height)) });
  };
  const endGraphPointer = () => { dragRef.current = null; panRef.current = null; };
  const zoomGraph = (next: number) => setGraphZoom(Math.max(.5, Math.min(2, next)));
  if (!selectedNode) return <div className="page graph-page graph-loading"><span className="spinner" /><strong>正在读取知识图谱</strong><small>/api/graph · IFC + 台账 + BA/BMS 点表</small></div>;
  const propertyEntries = Object.entries(selectedNode.properties || {}).filter(([, value]) => typeof value !== "object").slice(0, 5);
  const selectedGlobalId = selectedNode.kind === "设备" ? String(selectedNode.properties?.ifc_global_id || "") : "";
  const selectedModelIds = modelGroup?.systemName
    ? [...new Set([...(modelGroup.globalIds || []), ...systemAssetGlobalIds(assets, modelGroup.systemName)])]
    : modelGroup?.globalIds || (selectedGlobalId ? [selectedGlobalId] : []);
  const selectedModelLabel = modelGroup?.label || selectedNode.label;
  const entityFilters: Array<[string, number, string]> = [["设备", graphData?.nodes.filter(node => node.kind === "设备" || node.kind === "设备类型").length || 0, "#2d6f93"], ["系统", graphData?.nodes.filter(node => node.kind === "系统").length || 0, "#5d88a0"], ["空间", graphData?.nodes.filter(node => node.kind === "空间" || node.kind === "房间").length || 0, "#c38a2e"], ["服务区域", graphData?.meta.service_area_count || 0, "#c38a2e"], ["点位", graphData?.meta.point_count || 0, "#2d8061"], ["报警", graphData?.nodes.filter(node => node.kind === "报警").length || 0, "#b94b45"]];
  const graphExamples = [{ question: "AHU-0B2-04 属于哪个系统？", answer: "AHU-0B2-04 已关联送风系统 SA 94、回风系统 RA 93 和新风系统 FA 58。" }, { question: "该设备服务哪些区域？", answer: "当前图谱关联 B1 公共区东段、L1 到达厅东区和 L2 候机区中段 3 个服务区域。" }, { question: "当前报警关联哪些对象？", answer: demoAlarm ? "风量不足报警已关联末端风口 5466537、上游风管 5466492、SA 94 系统及 AHU-0B2-04。" : "当前对象可从关系网络继续查看所属系统、空间、点位与服务区域。" }];
  return <div className="page graph-page">
    <div className="page-head compact"><div><h2>机电系统 AI 运维知识图谱</h2><p>建筑系统拓扑、IFC 三维构件与语义关系同步联动</p></div><div className="head-tools"><Badge tone="green"><span className="live-dot" />IFC {graphData?.meta.asset_count?.toLocaleString() || "—"} 设备已解析</Badge><Badge tone="amber">补充关系为 Demo</Badge><button className="outline" onClick={() => setShowLedger(true)}><Icon name="file" />数据台账</button><button className="primary small" onClick={() => void graphPanelRef.current?.requestFullscreen()}><Icon name="expand" />沉浸分析</button></div></div>
    <div className="kg-layout graph-feedback">
      <aside className="panel kg-sidebar feedback-tree">
        <div className="kg-search"><Icon name="search" /><input value={assetQuery} placeholder="搜索设备编码或名称" onChange={event => setAssetQuery(event.target.value)} onKeyDown={event => event.key === "Enter" && assetQuery.trim() && loadGraph(assetQuery)} aria-label="设备清单搜索" /></div>
        <div className="asset-tree"><div className="asset-tree-head"><small>设备清单</small><Badge tone="blue">{filteredAssets.length} 台</Badge></div>{assetGroups.map(group => <div className="asset-group" key={group.name}><button className={`asset-group-button ${modelGroup?.name === group.name ? "selected" : ""}`} onClick={() => isolateAssetGroup(group.name, group.items)} aria-label={`隔离${group.name}分组的${group.items.length}台设备`}><Icon name="chevron" size={13} /><span>{group.name}</span><b>{group.items.length}</b></button>{(openAssetGroups.has(group.name) || Boolean(assetQuery.trim())) && <div className="asset-items">{group.items.map(asset => <button key={asset.asset_code} className={selected === `asset:${asset.asset_code}` && !modelGroup ? "selected" : ""} onClick={() => loadGraph(asset.asset_code)}><i /><span><strong>{asset.asset_code}</strong><small>{asset.name || asset.ifc_class}</small></span></button>)}</div>}</div>)}</div>
        <div className="kg-section"><small>图谱范围</small><label>当前邻域 <b>{graphDepth} 跳</b></label><input aria-label="图谱邻域层级" type="range" min="1" max="3" step="1" value={graphDepth} onChange={event => {
          const next = Number(event.target.value);
          setGraphDepth(next);
          loadGraph(currentFocus, next);
        }} /><div className="range-label"><span>1 跳</span><span>2 跳</span><span>3 跳</span></div></div>
        <div className="kg-section entity-filter-sidebar"><small>实体类型</small>{entityFilters.map(x => <label className="check-row" key={String(x[0])}><input type="checkbox" checked={visibleKinds[String(x[0])] !== false} onChange={event => setVisibleKinds(current => ({ ...current, [String(x[0])]: event.target.checked }))} /><i style={{
              background: String(x[2])
            }} /><span>{x[0]}</span><b>{x[1]}</b></label>)}</div>
        <div className="kg-section"><small>关系类型</small><div className="relation-key"><span><i className="line solid" />上下游</span><span><i className="line blue" />连接</span><span><i className="line amber" />服务区域</span><span><i className="line dash" />方向待确认</span></div></div>
        <div className="source-note"><Icon name="file" /><span><strong>数据来源与部署</strong><small>IFC V1 · 台账/点表待确认 · 服务目标 192.168.2.153</small></span></div>
      </aside>
      <main className="kg-main panel" ref={graphPanelRef}>
        {demoAlarm && <section className="diagnosis-runway" aria-label="风量不足诊断路径">
          <div className="runway-title"><span><Icon name="alarm" /><b>{demoAlarm.alarmId}</b></span><Badge tone="red">风量 {airflowDeviationPercent(demoAlarm)}%</Badge><small>蓝色实线为 IFC · 橙色虚线为 Demo 补充关系</small></div>
          <div className="runway-steps">
            <button className={selected === `asset:${demoAlarm.assetCode}` ? "active" : ""} onClick={() => selectGraphNode(`asset:${demoAlarm.assetCode}`)}><b>01</b><span><strong>复核末端风量</strong><small>风量罩复测 · 一般工程建议</small></span></button>
            <button className={selected === "asset:5466492" ? "active" : ""} onClick={() => selectGraphNode("asset:5466492")}><b>02</b><span><strong>检查上游风管</strong><small>5466492 · IFC连接</small></span></button>
            <button className={selected === "system:SA 94" ? "active" : ""} onClick={() => selectGraphNode("system:SA 94")}><b>03</b><span><strong>判断系统性异常</strong><small>SA 94 · Demo补充关系</small></span></button>
            <button className={selected === "asset:AHU-0B2-04" ? "active" : ""} onClick={() => selectGraphNode("asset:AHU-0B2-04")}><b>04</b><span><strong>回溯空调机组</strong><small>阀门 / 过滤器 / 盘管 / 风机</small></span></button>
            <button className="runway-cta" onClick={goAssistant}>咨询运维助手<Icon name="arrow" size={14} /></button>
          </div>
        </section>}
        <div className="kg-split">
          <div className="kg-model-stack"><MiniModel selectedGlobalIds={selectedModelIds} selectedLabel={selectedModelLabel} title="IFC 三维模型" /><SemanticQuery value={semanticQuery} onChange={setSemanticQuery} onSubmit={value => loadGraph(value)} context={`${selectedNode.label} · ${selectedNode.kind}`} count={visibleGraphNodes.length} examples={graphExamples} /></div>
          <div className="graph-view">
            <div className="model-title"><span><i className="live-dot" />关系网络</span><div><button className={graphMode === "system" ? "mini-active" : ""} onClick={() => setGraphMode("system")}>系统拓扑</button><button className={graphMode === "semantic" ? "mini-active" : ""} onClick={() => setGraphMode("semantic")}>语义关系</button></div></div>
            <div className="graph-filterbar"><span><Icon name="filter" size={14} />领域筛选</span>{entityFilters.map(([kind]) => <label key={kind}><input type="checkbox" checked={visibleKinds[kind] !== false} onChange={event => setVisibleKinds(current => ({ ...current, [kind]: event.target.checked }))} />{kind}</label>)}<button onClick={() => setShowRoomModal(true)}>关系说明</button></div>
            <svg ref={graphSvgRef} className="graph-interactive" viewBox="0 0 760 520" aria-label="机电系统知识图谱" onPointerMove={moveGraphPointer} onPointerUp={endGraphPointer} onPointerCancel={endGraphPointer}>
              <defs><pattern id="kgdots" width="18" height="18" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".6" fill="#cbd6da" /></pattern><marker id="kgarr" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0l8 4-8 4z" fill="#2d6f93" /></marker><marker id="kgarrAmber" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0l8 4-8 4z" fill="#c38a2e" /></marker></defs>
              <rect width="760" height="470" fill="url(#kgdots)" onPointerDown={beginGraphPan} />
              <g transform={`translate(${graphPan.x} ${graphPan.y}) translate(380 260) scale(${graphZoom}) translate(-380 -260)`}><g>{visibleEdges.map((edge, index) => {
                const source = nodeById.get(edge.source);
                const target = nodeById.get(edge.target);
                if (!source || !target) return null;
                const service = edge.type === "SERVES" || edge.type === "SUPPLIES";
                const demoEdge = edge.source_kind?.includes("demo");
                const alarmEdge = edge.type === "TRIGGERED_ON";
                const bendX = (source.x + target.x) / 2;
                return <g key={`${edge.source}-${edge.type}-${edge.target}`}><path d={`M${source.x} ${source.y} C${bendX} ${source.y},${bendX} ${target.y},${target.x} ${target.y}`} fill="none" stroke={alarmEdge ? "#b94b45" : demoEdge || service ? "#c38a2e" : edge.type === "HAS_POINT" ? "#2d8061" : "#5d88a0"} strokeWidth={alarmEdge || service ? 2 : 1.4} strokeDasharray={demoEdge ? "6 4" : undefined} markerEnd={demoEdge || service ? "url(#kgarrAmber)" : "url(#kgarr)"} />{index < 12 && <text x={bendX} y={(source.y + target.y) / 2 - 5} textAnchor="middle" className={`edge-label ${demoEdge ? "amber-edge" : ""}`}>{edge.type}</text>}</g>;
              })}</g>
              {visibleGraphNodes.map(n => <g key={n.id} transform={`translate(${n.x} ${n.y})`} className={`kg-node node-${n.kind === "报警" ? "alarm" : n.tone} ${selected === n.id ? "selected" : ""}`} onPointerDown={event => beginNodeDrag(event, n)} onKeyDown={e => {
                if (e.key === "Enter" || e.key === " ") selectGraphNode(n.id);
              }} role="button" tabIndex={0} aria-label={`${n.label} ${n.kind}`}>
                <rect x="-58" y="-28" width="116" height="56" rx="8" /><circle cx="-42" cy="-12" r="5" /><text className="node-label" textAnchor="middle" y="-2">{n.label}</text><text className="node-kind" textAnchor="middle" y="16">{n.kind}</text>
              </g>)}</g>
            </svg>
            <div className="graph-controls"><button onClick={() => zoomGraph(graphZoom + .1)}>＋</button><button onClick={() => zoomGraph(graphZoom - .1)}>−</button><button onClick={() => { setGraphZoom(1); setGraphPan({ x: 0, y: 0 }); setNodeOverrides({}); }} title="重置拓扑布局">◎</button><span>滚轮缩放 · 左键拖动画布 · 节点可单独拖动 · {visibleGraphNodes.length} 节点 / {visibleEdges.length} 关系</span></div>
            <div className="selected-node-strip"><span className={`detail-kind ${selectedNode.tone}`}><Icon name={selectedNode.kind === "房间" || selectedNode.kind === "空间" || selectedNode.kind === "服务区域" ? "building" : "activity"} /></span><span><small>当前选中 · 模型已联动隔离</small><strong>{selectedNode.label}</strong></span><Badge tone="blue">{selectedNode.kind}</Badge><button onClick={() => setDetailsOpen(open => !open)}>{detailsOpen ? "收起对象详情" : "查看对象详情"} <Icon name="chevron" size={13} /></button></div>
          </div>
        </div>
        {detailsOpen && <section className="kg-details">
          <div className="detail-head"><div><span className={`detail-kind ${selectedNode.tone}`}><Icon name={selectedNode.kind === "房间" || selectedNode.kind === "空间" || selectedNode.kind === "服务区域" ? "building" : "activity"} /></span><div><small>{selectedNode.kind}</small><h3>{selectedNode.label}</h3></div></div><div className="detail-tabs"><button className={tab === "props" ? "active" : ""} onClick={() => setTab("props")}>对象属性</button><button className={tab === "points" ? "active" : ""} onClick={() => setTab("points")}>监测点位 <b>{pointNodes.length}</b></button><button className={tab === "relations" ? "active" : ""} onClick={() => setTab("relations")}>关联关系 <b>{incidentEdges.length}</b></button></div><button className="ledger-link" onClick={() => setShowLedger(true)}>IFC + 台账 + 演示点表 <Icon name="chevron" size={13} /></button></div>
          {tab === "props" && <div className="property-grid">{propertyEntries.length ? propertyEntries.map(([key, value]) => <span key={key}><small>{key}</small><strong>{String(value || "—")}</strong></span>) : <span><small>实体标识</small><strong>{selectedNode.id}</strong></span>}</div>}
          {tab === "points" && <div className="point-table"><div className="table-head"><span>点位</span><span>类型 / 地址</span><span>单位</span><span>来源</span></div>{pointNodes.map(node => <div key={node.id}><span><code>{node.label.replace("AHU-0B2-04.", "")}</code></span><span>{String(node.properties?.io_type || "—")} · {String(node.properties?.address || "—")}</span><strong>{String(node.properties?.unit || "—")}</strong><span><Badge tone="amber">{String(node.properties?.source || "Demo")}</Badge></span></div>)}</div>}
          {tab === "relations" && <div className="relation-cards graph-relation-cards">{incidentEdges.slice(0, 3).map(edge => {
            const outgoing = edge.source === selected;
            const other = nodeById.get(outgoing ? edge.target : edge.source);
            const service = edge.type === "SERVES" || edge.type === "SUPPLIES";
            return <div key={`${edge.source}-${edge.type}-${edge.target}`} className={service ? "service-card" : ""}><Badge tone={service ? "amber" : "blue"}>{edge.type}</Badge><strong>{outgoing ? selectedNode.label : other?.label} → {outgoing ? other?.label : selectedNode.label}</strong><span>{edge.source_kind?.includes("demo") ? "Demo 补充关系，待实施校核" : "来自 IFC / 图谱实际关系数据"}</span>{service && <button onClick={() => setShowRoomModal(true)}>查看房间与服务区域关系 <Icon name="arrow" size={13} /></button>}</div>;
          })}</div>}
        </section>}
      </main>
    </div>
    {showLedger && <DataLedgerModal onClose={() => setShowLedger(false)} />}
    {showRoomModal && <RoomServiceModal onClose={() => setShowRoomModal(false)} />}
  </div>;
}
const suggestions = ["空调机组风量不足怎么排查？", "AHU-0B2-04 最近有哪些报警？", "生成本周过滤器维护计划", "查找该设备关联图纸"];
type AssistantEvidence = { document?: string; page?: number; content?: string };
type AssistantResponse = {
  answer: string;
  steps: string[];
  evidence: AssistantEvidence[];
  provider: string;
};
type AssistantHistoryItem = AssistantResponse & {
  id: string;
  title: string;
  question: string;
  created_at: string;
  context: Record<string, string>;
};
type AssistantHistoryPayload = { total: number; items: AssistantHistoryItem[] };
const initialAssistantQuestion = "根据现有资料，空调机组风量不足应该检查什么？设备是 AHU-0B2-04。";
const emptyAssistantResponse: AssistantResponse = { answer: "", steps: [], evidence: [], provider: "loading" };
function documentPreviewUrl(document: string, page = 1) {
  const path = document.split("/").map(encodeURIComponent).join("/");
  return `/api/documents/file/${path}#page=${Math.max(1, page)}&view=FitH`;
}
function formatAssistantHistoryTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "时间未知";
  const today = new Date();
  const time = `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  return date.toDateString() === today.toDateString() ? `今天 ${time}` : `${date.getMonth() + 1}月${date.getDate()}日 ${time}`;
}
function Assistant({ goGraph, demoAlarm }: { goGraph: () => void; demoAlarm: AirflowAlarmContext | null }) {
  const seededQuestion = demoAlarm ? buildAirflowAssistantQuestion(demoAlarm) : initialAssistantQuestion;
  const [input, setInput] = useState("");
  const [asked, setAsked] = useState(Boolean(demoAlarm));
  const [question, setQuestion] = useState(demoAlarm ? seededQuestion : "");
  const [loading, setLoading] = useState(Boolean(demoAlarm));
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyQuery, setHistoryQuery] = useState("");
  const [history, setHistory] = useState<AssistantHistoryItem[]>([]);
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [response, setResponse] = useState<AssistantResponse>(emptyAssistantResponse);
  const [selectedEvidence, setSelectedEvidence] = useState(0);
  const [previewDocument, setPreviewDocument] = useState<AssistantEvidence | null>(null);
  const [sideTab, setSideTab] = useState<"asset" | "evidence">(demoAlarm ? "evidence" : "asset");
  const historyInitialized = useRef(false);
  const alarmRequestStarted = useRef(false);
  const selectHistory = (item: AssistantHistoryItem) => {
    const historyResponse: AssistantResponse = {
      answer: item.answer,
      steps: item.steps,
      evidence: item.evidence,
      provider: item.provider
    };
    setActiveHistoryId(item.id);
    setAsked(true);
    setQuestion(item.question);
    setResponse(historyResponse);
    setSelectedEvidence(0);
    setPreviewDocument(null);
    setLoading(false);
  };
  const requestAnswer = async (nextQuestion: string, context: Record<string, string> = {}) => {
    setAsked(true);
    setQuestion(nextQuestion);
    setLoading(true);
    setPreviewDocument(null);
    try {
      const result = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: nextQuestion, context })
      });
      if (!result.ok) throw new Error("助手服务响应异常");
      const nextResponse: AssistantHistoryItem = await result.json();
      setResponse(nextResponse);
      setActiveHistoryId(nextResponse.id);
      setHistory(current => [nextResponse, ...current.filter(item => item.id !== nextResponse.id)]);
      setHistoryQuery("");
      setSelectedEvidence(0);
      setSideTab("evidence");
    } catch (reason) {
      setResponse({
        answer: reason instanceof Error ? reason.message : "助手服务暂不可用，请稍后重试。",
        steps: [],
        evidence: [],
        provider: "error"
      });
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setHistoryLoading(true);
      try {
        const result = await fetch(`/api/assistant/history?q=${encodeURIComponent(historyQuery)}&limit=100`, { signal: controller.signal });
        if (!result.ok) throw new Error("历史记录加载失败");
        const payload: AssistantHistoryPayload = await result.json();
        setHistory(payload.items);
        if (!demoAlarm && !historyInitialized.current) {
          historyInitialized.current = true;
          if (payload.items.length > 0) selectHistory(payload.items[0]);
          else {
            setAsked(false);
            setLoading(false);
          }
        }
      } catch (reason) {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        if (!demoAlarm && !historyInitialized.current) {
          historyInitialized.current = true;
          setAsked(false);
          setLoading(false);
        }
        setNotice(reason instanceof Error ? reason.message : "历史记录暂不可用");
      } finally {
        if (!controller.signal.aborted) setHistoryLoading(false);
      }
    }, historyQuery ? 250 : 0);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [historyQuery]);
  useEffect(() => {
    if (demoAlarm && !alarmRequestStarted.current) {
      alarmRequestStarted.current = true;
      void requestAnswer(seededQuestion, { alarm_id: demoAlarm.alarmId, asset_code: demoAlarm.assetCode, source: "alarm" });
    }
  }, []);
  useEffect(() => {
    if (!previewDocument) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPreviewDocument(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [previewDocument]);
  const send = async () => {
    const nextQuestion = input.trim();
    if (!nextQuestion || loading) return;
    setInput("");
    await requestAnswer(nextQuestion, demoAlarm ? { alarm_id: demoAlarm.alarmId, asset_code: demoAlarm.assetCode, source: "alarm" } : {});
  };
  const activeEvidence = response.evidence[selectedEvidence];
  const providerLabel = response.provider === "open-webui" ? "Open WebUI 实时生成" : response.provider === "error" ? "服务异常" : response.provider === "loading" ? "等待提问" : "本地检索 · 模板回答";
  const confidence = !asked || loading ? 0 : response.provider === "open-webui" ? 92 : response.provider === "error" ? 0 : 76;
  return <><div className="page assistant-page">
    <div className="page-head compact"><div><h2>运维智能助手</h2><p>以空间与设备为上下文，联合三维模型、知识图谱和手册知识库辅助处置</p></div><div className="head-tools"><Badge tone="green"><span className="live-dot" />资料检索已接入</Badge><Badge tone="green">4 份 PDF · 67 页</Badge></div></div>
    <div className="assistant-layout">
      <aside className="panel conversation-list">
        <button className="primary new-chat" onClick={() => { setActiveHistoryId(null); setAsked(false); setQuestion(""); setInput(""); setResponse(emptyAssistantResponse); setPreviewDocument(null); setNotice("已新建会话，请输入问题"); }}><span>＋</span>新建会话</button>
        <div className="kb-scope"><div><Icon name="layers" /><span><small>当前知识库</small><strong>机场机电运维资料库</strong></span></div><p>{response.provider === "open-webui" ? "Open WebUI" : "本地检索服务"} · 192.168.2.153</p><span><i className="live-dot" />本地资料检索已启用</span></div>
        <label className="conv-search"><Icon name="search" size={15} /><input value={historyQuery} onChange={event => setHistoryQuery(event.target.value)} aria-label="搜索历史会话" placeholder="搜索问题、回答或资料" /></label>
        <small className="group-label">{historyQuery ? `搜索结果 · ${history.length}` : `最近会话 · ${history.length}`}</small>
        <div className="conversation-history">
          {historyLoading && <div className="history-empty"><span className="spinner" />正在加载历史记录</div>}
          {!historyLoading && history.length === 0 && <div className="history-empty">{historyQuery ? "没有匹配的历史记录" : "暂无历史记录，请新建会话"}</div>}
          {!historyLoading && history.map(item => <button key={item.id} className={`conv ${activeHistoryId === item.id ? "active" : ""}`} onClick={() => selectHistory(item)}><Icon name="chat" /><span><strong>{item.title}</strong><small>{formatAssistantHistoryTime(item.created_at)}{item.context?.asset_code ? ` · ${item.context.asset_code}` : ""}</small></span></button>)}
        </div>
        <div className="assistant-cap"><Icon name="spark" /><span><strong>仅基于本地资料回答</strong><small>设备手册、技术样本、培训卡和消防图纸均显示可追溯来源。</small></span></div>
      </aside>
      <div className="assistant-center-stack">
      <MiniModel selectedGlobalIds={[demoAlarm?.ifcGlobalId || "3nUg2jPlz76PUi_3jscap4"]} selectedLabel={demoAlarm?.assetCode || "AHU-0B2-04"} title="IFC 三维模型" className="assistant-ifc-model" />
      <main className="panel chat-panel">
        <div className="chat-head"><div><span className="ai-orb"><Icon name="spark" /></span><div><h3>机场运维 Copilot</h3><small><i className="live-dot" />检索范围：机场机电运维资料库</small></div></div><button className="outline" disabled title="当前 Demo 使用固定本地知识库"><Icon name="more" />固定知识库</button></div>
        {demoAlarm && <div className="assistant-flow-context"><span><b>03</b>图谱上下文已带入</span>{airflowContextChips.map(chip => <Badge key={chip} tone={chip.startsWith("路径") ? "amber" : "blue"}>{chip}</Badge>)}</div>}
        <div className="messages">
          {!asked && !loading && <div className="assistant-empty"><span className="ai-orb"><Icon name="spark" /></span><strong>请选择历史记录或输入新的运维问题</strong><p>只有发送问题后才会检索资料；从首页报警进入时会自动启动诊断。</p><button onClick={() => setInput(initialAssistantQuestion)}>使用空调机组示例问题</button></div>}
          {asked && question && <div className="message user-message"><div><strong>运维管理员</strong><span>{question}</span></div><span className="avatar">WD</span></div>}
          {demoAlarm && <div className="message ai-message"><span className="ai-orb small"><Icon name="graph" size={15} /></span><div className="answer airflow-playbook"><div className="answer-head"><strong>图谱诊断摘要</strong><Badge tone="blue">IFC定位 + 手册规则</Badge></div><p>先确认末端测量，再沿 IFC 连接回溯风管；若同系统多个末端同时偏低，再检查 SA 94 和 AHU-0B2-04。</p><ol>
            <li><span>01</span><div><strong>复核送风口 5466537</strong><p>用风量罩复测并和设计图、调试报告或已确认基准比较；风量罩操作属于一般工程建议。</p></div><Badge tone="red">先查</Badge></li>
            <li><span>02</span><div><strong>检查上游风管 5466492</strong><p>检查局部风阀开度、执行器反馈、支管漏风、堵塞和风口遮挡；风口与该风管为 IFC 连接。</p></div></li>
            <li><span>03</span><div><strong>判断局部或系统性异常</strong><p>同步测量相邻送风口；单点偏低查局部支路，多点偏低再回溯 SA 94 与空调机组。</p></div></li>
            <li><span>04</span><div><strong>检查 AHU-0B2-04</strong><p>依次核对过滤器压差、盘管积尘、风机频率与电流、总管静压及系统阻力。</p></div></li>
          </ol><div className="playbook-basis"><span><Badge tone="green">手册明确</Badge><b>系统阻力过大、阀门开度不足、过滤器阻力大、换热器积尘会导致风量小。</b><small>《E-01-1 空调机组设备手册》第 6 页</small></span><span><Badge tone="amber">工程建议</Badge><b>风量罩、热球风速仪、微压计；设计图与调试报告作为目标值来源。</b><small>需结合机场测量规程与已确认阈值执行</small></span></div></div></div>}
          {asked && <div className="message ai-message"><span className="ai-orb small"><Icon name="spark" size={15} /></span><div className="answer"><div className="answer-head"><strong>{loading ? "正在检索机场运维资料…" : "基于运维资料的建议"}</strong><Badge tone={response.provider === "error" ? "red" : response.provider === "open-webui" ? "green" : "amber"}>{loading ? "检索中" : `${providerLabel} · ${response.evidence.length} 条证据`}</Badge></div><p>{loading ? "正在定位设备手册、技术样本和培训资料中的相关内容。" : response.answer}</p>{!loading && response.steps.length > 0 && <ol>{response.steps.map((step, index) => <li key={step}><span>{String(index + 1).padStart(2, "0")}</span><div><strong>{step}</strong><p>请结合现场状态、设备铭牌和已确认的报警阈值执行。</p></div>{index === 0 && <Badge tone="red">优先</Badge>}</li>)}</ol>}<div className="answer-actions"><button onClick={() => setNotice("已生成检查工单草稿 WO-DEMO-AHU-04，可在正式接入工单系统后提交")}><Icon name="work" />生成检查工单</button><button onClick={goGraph}><Icon name="graph" />打开设备图谱</button><span>{loading ? "正在连接 Open WebUI" : providerLabel}</span></div></div></div>}
        </div>
        {notice && <div className="assistant-notice"><Icon name="check" size={14} />{notice}<button onClick={() => setNotice("")}>×</button></div>}
        <div className="suggestions">{suggestions.map(s => <button key={s} onClick={() => setInput(s)}>{s}<Icon name="arrow" size={14} /></button>)}</div>
        <div className="composer"><textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={event => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            void send();
          }
        }} placeholder="询问设备故障、操作步骤、维护标准或历史经验…" /><div><span><button disabled title="Demo 暂不支持上传附件">＋</button><button onClick={() => setNotice(`当前会话已关联设备 ${demoAlarm?.assetCode || "AHU-0B2-04"}`)}><Icon name="link" size={16} />关联 {demoAlarm?.assetCode || "AHU-0B2-04"}</button></span><span><small>Enter 发送 · Shift+Enter 换行</small><button className="send" onClick={() => void send()} aria-label="发送" disabled={loading || !input.trim()}><Icon name="send" /></button></span></div></div>
      </main></div>
      <aside className="panel evidence-panel asset-brief">
        <div className="panel-head"><div><small>{sideTab === "asset" ? "选中设备" : "EVIDENCE"}</small><h3>{sideTab === "asset" ? "设备结构化信息" : "回答依据"}</h3></div><div className="side-tab-switch"><button className={sideTab === "asset" ? "active" : ""} onClick={() => setSideTab("asset")}>设备</button><button className={sideTab === "evidence" ? "active" : ""} onClick={() => setSideTab("evidence")}>依据</button></div></div>
        {sideTab === "asset" ? <div className="asset-brief-content"><div className="asset-title"><span className="detail-kind primary"><Icon name="activity" /></span><span><strong>AHU-0B2-04</strong><small>组合式空气处理机组</small></span><Badge tone="green">运行</Badge></div><div className="asset-facts">{[["名称", "AHU-0B2-04"], ["类型", "组合式空气处理机组"], ["运行状态", "运行 · 送风温度偏高"], ["所在空间", "T-BE-B1-M18 空调机房"], ["投运年份", "2025 · Demo"]].map(row => <span key={row[0]}><small>{row[0]}</small><strong>{row[1]}</strong></span>)}</div><section className="brief-section"><div><strong>设备资料</strong><Badge tone="blue">2</Badge></div>{["E-01-1 空调机组设备手册.pdf", "麦克维尔 MDM 系列组合式空气处理机组资料.pdf"].map(document => <button key={document} onClick={() => setPreviewDocument({ document, page: 1, content: "设备手册原文预览；内容来自机场机电运维资料库。" })}><Icon name="file" size={15} /><span>{document}</span><Icon name="expand" size={13} /></button>)}</section><section className="brief-section"><div><strong>历史维修记录</strong><Badge tone="amber">Demo</Badge></div><ol><li><time>2026-08-18</time><span><strong>更换中效过滤器</strong><small>工单 WO-260818-027 · 已完成</small></span></li><li><time>2026-06-03</time><span><strong>送风机皮带张紧</strong><small>工单 WO-260603-011 · 已完成</small></span></li></ol></section></div> : <>
        <div className="confidence"><div><strong>{confidence}%</strong><span>{response.provider === "open-webui" ? "回答置信度" : "检索匹配度"}</span></div><span><i style={{ width: `${confidence}%` }} /></span><small>{response.evidence.length} 项资料证据</small></div>
        <div className="evidence-list">
          {loading && <div className="evidence-empty">正在检索资料…</div>}
          {!loading && response.evidence.map((evidence, index) => <button key={`${evidence.document}-${evidence.page}-${index}`} className={selectedEvidence === index ? "active" : ""} onClick={() => { setSelectedEvidence(index); setPreviewDocument(evidence); }} title="打开原文预览"><span className={`source-icon ${index % 4 === 1 ? "code" : index % 4 === 2 ? "wo" : index % 4 === 3 ? "kg" : "pdf"}`}>PDF</span><span><small>第 {evidence.page || 1} 页 · 资料来源</small><strong>{evidence.document?.replace(/\.pdf$/i, "") || "未命名资料"}</strong><p>{evidence.content?.slice(0, 54) || "点击预览原文"}</p><span className="preview-entry">预览文档 <Icon name="arrow" size={12} /></span></span><em>{String(index + 1).padStart(2, "0")}</em></button>)}
          {!loading && response.evidence.length === 0 && <div className="evidence-empty">本次回答未检索到可引用资料</div>}
        </div>
        {activeEvidence && <div className="evidence-preview"><div><Icon name="file" /><span><strong>{activeEvidence.document}</strong><small>已定位第 {activeEvidence.page || 1} 页原文片段</small></span></div><p>{activeEvidence.content}</p><button onClick={() => setPreviewDocument(activeEvidence)}>打开文档预览 <Icon name="arrow" size={13} /></button></div>}</>}
      </aside>
    </div>
  </div>{previewDocument?.document && <section className="document-preview-shell" role="dialog" aria-modal="false" aria-label={`${previewDocument.document} 文档预览`}><header><div><small>DOCUMENT PREVIEW · 第 {previewDocument.page || 1} 页</small><strong>{previewDocument.document}</strong></div><button onClick={() => setPreviewDocument(null)} aria-label="关闭文档预览" title="关闭">×</button></header><iframe src={documentPreviewUrl(previewDocument.document, previewDocument.page)} title={`${previewDocument.document} 第 ${previewDocument.page || 1} 页`} /><footer><span>PDF 原文 · 可滚动、缩放与下载</span><button onClick={() => setPreviewDocument(null)}>关闭预览</button></footer></section>}</>;
}
function EnhancementStyles() {
  return <style>{`
    .drawing-tree{max-height:285px;overflow:auto;padding-bottom:4px}.drawing-tree button{min-width:0}.drawing-tree button>span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.drawing-tree .ifc-linked{margin:3px 0;padding:8px 6px;background:#fff4dd;color:#7b5418;border:1px solid #e7c47c;box-shadow:0 4px 12px rgba(195,138,46,.12)}.drawing-tree .ifc-linked:hover{background:#f9e8c4}.drawing-tree .ifc-linked .badge{padding:2px 4px;font-size:7px;margin-left:auto}.drawing-tree .ifc-linked b{margin-left:3px}.drawing-tree .room-disciplines{margin-left:12px;padding-left:8px;border-left:1px solid #dfc88f}.drawing-tree .room-disciplines button{color:#52656e}.drawing-tree .room-disciplines button.selected{color:var(--deep)}.drawing-tree .tree-child{padding-left:29px;color:#75858d}.ledger-link{display:flex;align-items:center;gap:5px;font-size:8px;color:var(--blue);background:#eef4f6;padding:6px 8px;border-radius:2px}
    .modal-backdrop{position:fixed;inset:0;z-index:1000;background:rgba(16,31,39,.5);backdrop-filter:blur(4px);display:grid;place-items:center;padding:28px}.data-modal{width:min(1060px,94vw);max-height:88vh;background:#fff;border:1px solid #afbec5;box-shadow:0 30px 90px rgba(9,25,34,.28);border-radius:5px;display:flex;flex-direction:column;overflow:hidden}.modal-head{display:flex;justify-content:space-between;align-items:flex-start;padding:22px 24px 18px;border-bottom:1px solid var(--line);background:linear-gradient(100deg,#fff,#f2f6f7)}.modal-head h3{font:700 23px/1.2 'Noto Serif SC';margin:5px 0}.modal-head p{font-size:10px;color:var(--muted);margin:0}.modal-close{width:34px;height:34px;border:1px solid var(--line);background:#fff;font-size:23px;line-height:1;color:#6e7d84}.room-facts{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:var(--line);border-bottom:1px solid var(--line)}.room-facts span{background:#fff;padding:13px 15px}.room-facts .wide{grid-column:span 4}.room-facts small,.room-facts strong{display:block}.room-facts small{font:500 8px 'IBM Plex Mono';color:#7e8c92;margin-bottom:5px}.room-facts strong{font:600 10px 'IBM Plex Mono'}.service-map{padding:25px 30px;display:grid;grid-template-columns:180px 120px 1fr;align-items:center;background-image:radial-gradient(#d2dce0 .7px,transparent .7px);background-size:18px 18px}.service-node{background:#fff;border:1px solid #8da5b0;padding:15px;box-shadow:0 5px 15px rgba(32,57,69,.07)}.service-node small,.service-node strong,.service-node span{display:block}.service-node small{font:500 8px 'IBM Plex Mono';color:#809097}.service-node strong{font:600 11px 'IBM Plex Mono';margin:5px 0}.service-node span{font-size:8px;color:var(--muted)}.service-node.source{border:2px solid var(--blue);background:#edf5f8}.service-lines{text-align:center;color:var(--blue);font:500 7px 'IBM Plex Mono'}.service-lines i{display:block;border-top:2px solid var(--blue);position:relative;margin:7px 0}.service-lines i:after{content:'';position:absolute;right:-1px;top:-5px;border-left:8px solid var(--blue);border-top:4px solid transparent;border-bottom:4px solid transparent}.service-zones{display:grid;grid-template-columns:repeat(3,1fr);gap:9px}.service-node.zone{border-color:#c7a763;background:#fffaf0}.relation-summary{display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:0 24px 20px}.relation-summary>div{display:flex;align-items:center;gap:10px;border:1px solid var(--line);padding:11px}.relation-summary>div>span:nth-child(2){flex:1}.relation-summary strong,.relation-summary small{display:block}.relation-summary strong{font-size:10px}.relation-summary small{font-size:8px;color:var(--muted);margin-top:3px}.relation-num{font:600 18px 'IBM Plex Mono';color:var(--blue)}.modal-foot{min-height:56px;border-top:1px solid var(--line);padding:10px 18px;display:flex;align-items:center;gap:8px;background:#f7f9f9}.modal-foot>span{font-size:8px;color:var(--muted);flex:1;display:flex;align-items:center;gap:7px}.modal-foot .primary,.modal-foot .outline{height:34px}
    .ledger-tabs{display:flex;padding:0 22px;border-bottom:1px solid var(--line)}.ledger-tabs button{height:50px;padding:0 20px;font-size:10px;position:relative;color:var(--muted)}.ledger-tabs button.active{color:var(--blue);font-weight:600}.ledger-tabs button.active:after{content:'';position:absolute;left:16px;right:16px;bottom:0;height:2px;background:var(--blue)}.ledger-tabs b{font:500 8px 'IBM Plex Mono';margin-left:4px;background:#edf1f3;padding:2px 4px}.ledger-table{padding:16px 22px 20px;overflow:auto;min-height:270px}.ledger-table>div{display:grid;align-items:center;border-bottom:1px solid #e6ebed;min-width:900px}.ledger-table>div:not(.ledger-header):hover{background:#f7fafb}.ledger-table>div>*{padding:10px 9px;font-size:8px;min-width:0;overflow:hidden;text-overflow:ellipsis}.ledger-table .ledger-header{background:#eef3f5;color:#65757d;font-weight:600}.ledger-table code{font:600 8px 'IBM Plex Mono';color:var(--blue)}.ledger-table strong{font:500 8px 'IBM Plex Mono'}.room-ledger>div{grid-template-columns:1fr 1.5fr .8fr 1.5fr 1.2fr}.asset-ledger>div{grid-template-columns:1.05fr 1.5fr 1.5fr 1.1fr 1.2fr 1.5fr}.point-ledger>div{grid-template-columns:.75fr 1.15fr .55fr .5fr 1.4fr 1.5fr}.point-ledger .badge{justify-self:start}.kb-scope{border:1px solid #bdd0d8;background:#f1f7f9;padding:10px;margin:12px 0 0}.kb-scope>div{display:flex;align-items:center;gap:7px;color:var(--blue)}.kb-scope small,.kb-scope strong{display:block}.kb-scope small{font-size:7px;color:var(--muted)}.kb-scope strong{font-size:9px}.kb-scope p{font:7px 'IBM Plex Mono';color:#5b6e77;margin:8px 0 5px}.kb-scope>span{display:flex;align-items:center;gap:5px;font-size:7px;color:#9b6d21}.pending-dot{width:6px;height:6px;border-radius:50%;background:var(--amber)}.conv-search input{width:100%;min-width:0;border:0;background:transparent;outline:0;color:var(--ink);font-size:9px}.conversation-history{min-height:0;flex:1;overflow:auto}.history-empty{padding:16px 8px;display:flex;align-items:center;justify-content:center;gap:7px;text-align:center;color:var(--muted);font-size:9px;line-height:1.5}.assistant-empty{min-height:240px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;color:var(--muted)}.assistant-empty strong{margin-top:14px;font-size:13px;color:var(--ink)}.assistant-empty p{max-width:380px;font-size:10px;line-height:1.7}.assistant-empty button{margin-top:4px;border:1px solid var(--line);background:#fff;padding:7px 11px;color:var(--blue);font-size:9px}
    .line.amber{border-color:#c38a2e}.kg-node:focus{outline:none}.kg-node:focus rect{stroke:#174760;stroke-width:3}.kg-node.node-zone rect{fill:#fff7e8;stroke:#c38a2e;stroke-width:1.5}.kg-node.node-zone circle{fill:#c38a2e}.edge-label.amber-edge{fill:#9b6d21;font-weight:600}.graph-relation-cards{grid-template-columns:.9fr 1.5fr 1fr}.graph-relation-cards .service-card{background:#fff8ea;border-color:#e4c27d}.service-card button{display:flex;align-items:center;gap:5px;color:#8b601b;font-size:8px;font-weight:600;margin-top:7px;padding:0}.service-card button:hover{color:#5f410f;text-decoration:underline}
    .login-bg{background-image:url('/login-bg-wireframe.png');background-image:image-set(url('/login-bg-wireframe.webp') type('image/webp'),url('/login-bg-wireframe.png') type('image/png'));filter:none;background-position:center center}.login-error,.ledger-error{margin:-8px 0 12px;padding:8px 10px;background:#f7e9e8;color:#a33e39;border:1px solid #e8c3c0;font-size:10px}.ledger-error{margin:12px 22px}
    .real-pdf iframe{display:block;width:100%;height:100%;border:0;background:#fff}.real-data-label{position:absolute;left:12px;bottom:12px;background:rgba(255,255,255,.92);border:1px solid var(--line);padding:7px 10px;font:500 8px 'IBM Plex Mono';color:var(--green);display:flex;align-items:center;gap:7px}.drawing-empty{align-items:center;justify-content:center;gap:8px;color:var(--muted)}.drawing-empty strong{font-size:12px;color:var(--ink)}.drawing-empty span{font-size:9px}.model-webgl{width:100%;height:calc(100% - 42px)}.model-webgl canvas{display:block;width:100%;height:100%}.model-loading{position:absolute;inset:42px 0 0;display:flex;align-items:center;justify-content:center;gap:9px;background:rgba(240,244,245,.9);font-size:10px;color:var(--blue);z-index:2}.model-loading .spinner{border-color:rgba(45,111,147,.2);border-top-color:var(--blue)}.model-error{color:var(--red)}.graph-loading{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:9px}.graph-loading .spinner{border-color:rgba(45,111,147,.2);border-top-color:var(--blue)}.graph-loading small{color:var(--muted)}
    button:disabled{cursor:not-allowed;opacity:.48}.kg-layout.filters-collapsed{grid-template-columns:1fr}.kg-sidebar.collapsed{display:none}.kg-main:fullscreen{width:100vw;height:100vh;background:#fff}.model-controls button.mini-active{background:#e8f1f5;color:var(--blue)}.assistant-notice{margin:0 15px 4px;padding:8px 10px;background:#e8f2ed;color:var(--green);display:flex;align-items:center;gap:7px;font-size:8px}.assistant-notice button{margin-left:auto;color:var(--green);font-size:15px}.range-label span{font-size:7px;line-height:1.4}
    .asset-tree{max-height:265px;overflow:auto;padding:2px 0 11px;border-bottom:1px solid var(--line)}.asset-tree-head{display:flex;align-items:center;justify-content:space-between;padding:2px 3px 8px}.asset-tree-head>small{font:600 10px 'IBM Plex Mono';letter-spacing:.12em;color:#74848c}.asset-group-button{width:100%;display:flex;align-items:center;gap:6px;padding:8px 5px;text-align:left;font-size:11px;font-weight:600}.asset-group-button:hover{background:#f4f7f8}.asset-group-button.selected{background:#e6f1f5;color:var(--deep);box-shadow:inset 3px 0 var(--blue)}.asset-group-button svg{transform:rotate(90deg)}.asset-group-button b{margin-left:auto;font:500 9px 'IBM Plex Mono';color:var(--muted)}.asset-items{margin-left:7px;border-left:1px solid #d9e2e6;padding-left:7px}.asset-items button{width:100%;display:flex;align-items:center;gap:7px;text-align:left;padding:7px 6px;border-radius:2px}.asset-items button:hover,.asset-items button.selected{background:#eaf2f5;color:var(--blue)}.asset-items button>i{width:6px;height:6px;flex:0 0 6px;border-radius:50%;background:#7d919b}.asset-items button.selected>i{background:var(--blue);box-shadow:0 0 0 3px rgba(45,111,147,.13)}.asset-items button>span{min-width:0}.asset-items strong,.asset-items small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.asset-items strong{font:600 10px 'IBM Plex Mono'}.asset-items small{font-size:9px;color:var(--muted);margin-top:2px}.graph-view>svg{touch-action:none;user-select:none}.kg-node{cursor:grab}.kg-node:active{cursor:grabbing}.kg-node rect{transition:stroke .16s,fill .16s}.kg-node.selected rect{filter:drop-shadow(0 5px 7px rgba(30,67,84,.22))}
    .page .eyebrow{font-size:11px}.page .badge{font-size:10px}.page .outline,.page .text-button{font-size:11px}.page .panel-head small{font-size:10px}.page .panel-head h3{font-size:16px}.home-page .metric-copy small{font-size:12px}.home-page .metric-copy>span,.home-page .alarm-summary span,.home-page .work-legend span{font-size:11px}.home-page .alarm-list strong{font-size:12px}.home-page .alarm-list small,.home-page .alarm-list time,.home-page .map-legend{font-size:10px}.home-page .seg button{font-size:10px}.drawing-page .tree,.drawing-page .discipline-list button,.drawing-page .nl-search input{font-size:12px}.drawing-page .tree button b,.drawing-page .discipline-list b{font-size:10px}.drawing-page .query-hint,.drawing-page .result-filter,.drawing-page .version-note small{font-size:10px}.drawing-page .drawing-toolbar strong,.drawing-page .drawing-toolbar span,.drawing-page .drawing-results strong{font-size:11px}.drawing-page .drawing-results small,.drawing-page .drawing-results em{font-size:9px}.graph-page .kg-search input,.graph-page .model-title{font-size:11px}.graph-page .kg-section>small{font-size:10px}.graph-page .kg-section>label:not(.check-row),.graph-page .check-row,.graph-page .relation-key span{font-size:11px}.graph-page .range-label span,.graph-page .source-note small{font-size:9px}.graph-page .source-note strong{font-size:11px}.graph-page .node-label{font-size:11px}.graph-page .node-kind,.graph-page .edge-label{font-size:9px}.graph-page .graph-controls span,.graph-page .model-stats span{font-size:9px}.graph-page .detail-head small,.graph-page .property-grid small,.graph-page .relation-cards>div>span{font-size:10px}.graph-page .detail-head h3,.graph-page .property-grid strong,.graph-page .relation-cards strong{font-size:11px}.graph-page .detail-tabs button,.graph-page .point-table{font-size:10px}.assistant-page .kb-scope small,.assistant-page .group-label,.assistant-page .conv small,.assistant-page .chat-head small,.assistant-page .evidence-list small,.assistant-page .evidence-list p,.assistant-page .evidence-preview small{font-size:9px}.assistant-page .kb-scope strong,.assistant-page .conv strong,.assistant-page .answer li strong,.assistant-page .evidence-list strong,.assistant-page .evidence-preview strong{font-size:11px}.assistant-page .answer>p,.assistant-page .answer li p,.assistant-page .user-message div>span,.assistant-page .composer textarea{font-size:11px}.assistant-page .suggestions button,.assistant-page .answer-actions button,.assistant-page .evidence-preview p,.assistant-page .evidence-preview button{font-size:10px}
    .demo-journey{margin:0 0 12px;border:1px solid #e1b3af;background:#fff;box-shadow:0 8px 24px rgba(105,45,40,.07)}.journey-progress{height:32px;padding:0 16px;display:flex;align-items:center;gap:10px;background:#f8fafb;border-bottom:1px solid var(--line);color:#7b898f;font-size:10px}.journey-progress span{display:flex;align-items:center;gap:6px;white-space:nowrap}.journey-progress span.active{color:var(--red);font-weight:600}.journey-progress b{font:600 9px 'IBM Plex Mono'}.journey-progress i{width:52px;border-top:1px solid #cdd7db}.journey-alert{min-height:72px;padding:10px 14px;display:flex;align-items:center;gap:13px}.journey-severity{width:38px;height:38px;flex:0 0 38px;display:grid;place-items:center;background:#f6e9e8;color:var(--red)}.journey-copy{min-width:210px;flex:1}.journey-copy small,.journey-copy strong,.journey-copy em{display:block}.journey-copy small{font:600 9px 'IBM Plex Mono';color:var(--red)}.journey-copy strong{font-size:15px;margin:2px 0}.journey-copy em{font-size:10px;font-style:normal;color:var(--muted)}.journey-reading{min-width:190px;padding-left:15px;border-left:1px solid var(--line)}.journey-reading small,.journey-reading strong,.journey-reading b{display:block}.journey-reading small{font-size:9px;color:var(--muted)}.journey-reading strong{font:600 20px 'IBM Plex Mono';margin:2px 0}.journey-reading strong em{font:500 10px 'Noto Sans SC';font-style:normal}.journey-reading b{font:600 9px 'IBM Plex Mono';color:var(--red)}.journey-alert>.primary{height:38px;display:flex;align-items:center;gap:8px;padding:0 14px;white-space:nowrap}
    .diagnosis-runway{flex:0 0 auto;border-bottom:1px solid var(--line);background:#f9fbfb}.runway-title{height:32px;padding:0 12px;display:flex;align-items:center;gap:8px}.runway-title>span{display:flex;align-items:center;gap:6px;color:var(--red)}.runway-title>span svg{width:14px}.runway-title>span b{font:600 9px 'IBM Plex Mono'}.runway-title>small{margin-left:auto;font-size:9px;color:var(--muted)}.runway-steps{display:grid;grid-template-columns:repeat(4,minmax(120px,1fr)) auto;border-top:1px solid #e7ecee}.runway-steps>button:not(.runway-cta){min-width:0;display:flex;align-items:center;gap:8px;text-align:left;padding:8px 10px;border-right:1px solid #e1e7e9}.runway-steps>button:not(.runway-cta):hover,.runway-steps>button.active{background:#eaf2f5}.runway-steps>button>b{font:600 10px 'IBM Plex Mono';color:var(--blue)}.runway-steps button span{min-width:0}.runway-steps strong,.runway-steps small{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.runway-steps strong{font-size:10px}.runway-steps small{font-size:8px;color:var(--muted);margin-top:2px}.runway-cta{align-self:stretch;padding:0 12px;background:var(--deep);color:#fff;display:flex;align-items:center;justify-content:center;gap:6px;font-size:10px;white-space:nowrap}.kg-node.node-alarm rect{fill:#f8eae9;stroke:var(--red);stroke-width:2}.kg-node.node-alarm circle{fill:var(--red)}
    .assistant-flow-context{min-height:40px;padding:6px 15px;display:flex;align-items:center;gap:6px;flex-wrap:wrap;border-bottom:1px solid var(--line);background:#f7fafb}.assistant-flow-context>span{display:flex;align-items:center;gap:6px;margin-right:3px;font-size:10px;color:var(--blue)}.assistant-flow-context>span b{font:600 10px 'IBM Plex Mono';width:23px;height:23px;display:grid;place-items:center;background:var(--deep);color:#fff}.assistant-flow-context .badge{font-size:9px}
    .airflow-playbook{border-color:#9bb7c3;background:#fbfdfd}.airflow-playbook>p{margin-bottom:7px}.airflow-playbook ol{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 14px;margin-bottom:8px}.airflow-playbook li{min-width:0}.playbook-basis{display:grid;grid-template-columns:1fr 1fr;gap:8px;border-top:1px solid #e4eaec;padding-top:9px}.playbook-basis>span{padding:8px;background:#f2f6f7}.playbook-basis b,.playbook-basis small{display:block}.playbook-basis b{font-size:9px;line-height:1.5;margin:5px 0 3px}.playbook-basis small{font-size:8px;color:var(--muted)}
    .evidence-empty{padding:20px 12px;text-align:center;border:1px dashed var(--line);color:var(--muted);font-size:10px}.preview-entry{display:inline-flex!important;align-items:center;gap:4px!important;margin-top:6px!important;color:var(--blue)!important;font-size:9px!important;font-weight:600}.evidence-preview button:not(:disabled){color:var(--blue);font-weight:600}.document-preview-shell{position:fixed;z-index:1200;top:72px;right:18px;bottom:18px;width:min(720px,50vw);min-width:520px;display:flex;flex-direction:column;background:#fff;border:1px solid #aebdc4;border-radius:5px;box-shadow:0 26px 80px rgba(9,25,34,.34);overflow:hidden}.document-preview-shell header{min-height:64px;padding:12px 14px 10px 18px;display:flex;align-items:center;justify-content:space-between;gap:18px;border-bottom:1px solid var(--line);background:linear-gradient(100deg,#fff,#f1f6f7)}.document-preview-shell header div{min-width:0}.document-preview-shell header small,.document-preview-shell header strong{display:block}.document-preview-shell header small{font:600 9px 'IBM Plex Mono';letter-spacing:.08em;color:var(--blue);margin-bottom:4px}.document-preview-shell header strong{font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.document-preview-shell header button{width:34px;height:34px;flex:0 0 34px;border:1px solid var(--line);background:#fff;font-size:23px;line-height:1;color:#657780}.document-preview-shell iframe{width:100%;flex:1;border:0;background:#e8edef}.document-preview-shell footer{height:46px;flex:0 0 46px;padding:0 14px 0 18px;display:flex;align-items:center;justify-content:space-between;border-top:1px solid var(--line);background:#fff}.document-preview-shell footer span{font-size:9px;color:var(--muted)}.document-preview-shell footer button{height:29px;padding:0 12px;background:var(--deep);color:#fff;border-radius:3px;font-size:10px}
    .home-main-grid{grid-template-columns:minmax(0,1.72fr) minmax(350px,.68fr);min-height:calc(100vh - 300px)}.home-main-grid .campus-panel{height:auto;min-height:620px;display:flex;flex-direction:column}.home-main-grid .floor-map{height:auto;flex:1;min-height:500px}.home-right-stack{display:flex;flex-direction:column;gap:12px;min-width:0}.home-right-stack .alarm-panel{height:auto;flex:1;min-height:0}.home-right-stack .work-panel{height:205px;flex:0 0 205px}.home-right-stack .work-body{height:135px;gap:22px}.home-right-stack .work-donut{width:88px;height:88px}.home-right-stack .work-donut:after{width:60px;height:60px}.home-bottom-grid{grid-template-columns:1fr}.home-page .alarm-list{overflow:auto}.home-page .alarm-row{display:grid;grid-template-columns:minmax(0,1fr) auto;border-bottom:1px solid #eef2f3}.home-page .alarm-select{width:100%;display:flex;align-items:flex-start;text-align:left;padding:11px 4px;gap:9px}.home-page .alarm-select>span{flex:1;min-width:0}.home-page .alarm-select strong,.home-page .alarm-select small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.home-page .alarm-select time{margin-left:auto;white-space:nowrap}.home-page .alarm-select:disabled{opacity:1;color:inherit}.alarm-diagnose{margin:7px 8px 7px 0;padding:0 9px;display:flex;align-items:center;gap:5px;background:var(--deep);color:#fff;border-radius:3px;font-size:10px;font-weight:600;white-space:nowrap}.alarm-diagnose:hover{background:#103d55}.home-right-stack .alarm-list button{border-bottom:0}.home-right-stack .alarm-list .alarm-row:hover{background:#fafcfc}
    .home-page .alarm-row.selected{background:#fff6e5}.home-page .alarm-row.selected .alarm-select strong{color:var(--deep)}.selected-pin{stroke:#fff;stroke-width:3;filter:drop-shadow(0 0 5px rgba(185,75,69,.65))}.home-model-location{position:absolute;left:13px;top:14px;display:flex;flex-direction:column;align-items:flex-start;gap:4px;padding:10px 12px;background:rgba(255,255,255,.95);border:1px solid #e4b5b1;box-shadow:0 8px 20px rgba(105,45,40,.12)}.home-model-location strong{font:600 11px 'IBM Plex Mono';color:var(--ink)}.home-model-location small{font-size:9px;color:var(--muted)}
    .home-page{height:100%;min-height:0;display:flex;flex-direction:column;overflow:hidden;padding-bottom:14px}.home-page .page-head,.home-page .metric-grid{flex:0 0 auto}.home-page .metric-grid{grid-template-columns:repeat(3,1fr)}.home-feedback-grid{display:grid;grid-template-columns:minmax(0,1.72fr) minmax(360px,.68fr);gap:12px;flex:1;height:auto;min-height:0;margin-top:12px;overflow:hidden}.home-feedback-grid .campus-panel{height:auto;min-height:0;display:flex;flex-direction:column;overflow:hidden}.home-ifc-model{flex:1;min-height:0;border:0;border-top:1px solid var(--line);border-radius:0}.home-feedback-grid .home-right-stack{height:100%;min-height:0;overflow:hidden}.home-feedback-grid .alarm-panel{flex:1;min-height:0;display:flex;flex-direction:column}.home-feedback-grid .alarm-list{flex:1;min-height:0}.home-feedback-grid .work-panel{height:205px;flex:0 0 205px}.alarm-select em{font:500 9px 'IBM Plex Mono';font-style:normal;color:var(--amber);margin-left:5px}.home-ifc-model .model-loading{background:rgba(240,244,245,.82)}
    .feedback-three-column{display:grid;grid-template-columns:236px minmax(520px,1fr) 330px;gap:12px;height:calc(100vh - 154px);min-height:650px}.feedback-tree,.feedback-results{overflow:hidden}.drawings-feedback .feedback-tree{display:flex;flex-direction:column}.drawings-feedback .drawing-tree{max-height:none;min-height:0;flex:1}.drawing-tree .room-tree-branch.active>.demo-room{background:#eef4f6;color:var(--deep)}.drawing-tree .demo-room .badge{padding:2px 4px;font-size:7px;margin-left:auto}.drawing-center-feedback{min-width:0;display:flex;flex-direction:column;overflow:hidden}.drawing-ifc-model{flex:1;min-height:0;border:0;border-radius:0}.semantic-query{flex:0 0 auto;border-top:1px solid var(--line);padding:12px 14px;background:#fff;overflow:auto}.drawing-center-feedback>.semantic-query,.kg-model-stack>.semantic-query{flex:0 0 33.333%;min-height:210px}.semantic-head{display:flex;align-items:center;gap:9px}.semantic-head>div{flex:1}.semantic-head small,.semantic-head strong{display:block}.semantic-head small{font:500 9px 'IBM Plex Mono';letter-spacing:.08em;color:var(--muted)}.semantic-head strong{font-size:11px;margin-top:2px}.semantic-input{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;margin-top:10px}.semantic-input input{height:38px;border:1px solid #afc0c8;padding:0 11px;outline:0;font-size:11px}.semantic-input input:focus{border-color:var(--blue);box-shadow:0 0 0 3px rgba(45,111,147,.1)}.semantic-input .primary{height:38px}.semantic-samples{display:flex;align-items:center;gap:6px;margin-top:8px;overflow:hidden}.semantic-samples button{white-space:nowrap;background:#eef4f6;color:#477083;padding:6px 8px;font-size:9px}.semantic-samples button.active{background:#dcecf3;color:var(--deep);box-shadow:inset 0 -2px var(--blue)}.semantic-answer{display:flex;align-items:flex-start;gap:9px;margin-top:10px;padding:11px 12px;background:#f1f7f9;border-left:3px solid var(--blue);color:#536871;font-size:10px;line-height:1.65}.semantic-answer svg{flex:0 0 15px;color:var(--blue);margin-top:2px}.semantic-answer strong{display:block;color:var(--deep);font-size:10px;margin-bottom:2px}.feedback-results{display:flex;flex-direction:column}.feedback-results .drawing-results{flex:1;min-height:0;overflow:auto}.drawing-preview-entry{height:38px;margin:0 12px 12px;width:calc(100% - 24px)}.drawing-preview-backdrop{position:fixed;inset:0;z-index:1190;display:grid;place-items:center;padding:5vh 5vw;background:rgba(15,31,39,.52);backdrop-filter:blur(4px)}.drawing-preview-shell{position:relative;z-index:1200;width:min(1180px,90vw);height:min(900px,88vh);min-width:640px;display:flex;flex-direction:column;background:#fff;border:1px solid #aebdc4;border-radius:5px;box-shadow:0 26px 80px rgba(9,25,34,.34);overflow:hidden}.drawing-preview-shell>header{min-height:64px;padding:12px 14px 10px 18px;display:flex;align-items:center;justify-content:space-between;gap:18px;border-bottom:1px solid var(--line);background:linear-gradient(100deg,#fff,#f1f6f7)}.drawing-preview-shell>header small,.drawing-preview-shell>header strong{display:block}.drawing-preview-shell>header small{font:600 9px 'IBM Plex Mono';letter-spacing:.08em;color:var(--blue)}.drawing-preview-shell>header strong{font-size:13px;margin-top:4px}.drawing-preview-shell>header button{width:34px;height:34px;border:1px solid var(--line);background:#fff;font-size:23px}.drawing-preview-shell>.drawing-canvas{flex:1;min-height:0;border:0;border-radius:0}.drawing-preview-shell>footer{height:46px;flex:0 0 46px;padding:0 14px 0 18px;display:flex;align-items:center;justify-content:space-between;border-top:1px solid var(--line)}.drawing-preview-shell>footer span{font-size:9px;color:var(--muted)}.drawing-preview-shell>footer button{height:29px;padding:0 12px;background:var(--deep);color:#fff;border-radius:3px;font-size:10px}
    .graph-feedback .entity-filter-sidebar{display:none}.kg-model-stack{min-width:0;min-height:0;display:flex;flex-direction:column;border-right:1px solid var(--line)}.kg-model-stack>.model-view{flex:1;min-height:0;border-right:0}.graph-view{display:flex;flex-direction:column}.graph-filterbar{height:44px;flex:0 0 44px;display:flex;align-items:center;gap:10px;padding:0 12px;border-bottom:1px solid var(--line);background:#fff;font-size:9px}.graph-filterbar>span{display:flex;align-items:center;gap:5px;color:#5b6b73;font-weight:600}.graph-filterbar label{display:flex;align-items:center;gap:4px;white-space:nowrap}.graph-filterbar input{accent-color:var(--blue)}.graph-filterbar button{margin-left:auto;color:#8f661e;background:#fff5df;padding:6px 8px}.graph-view>svg{flex:1;min-height:0;height:auto}.graph-interactive{cursor:grab}.graph-interactive:active{cursor:grabbing}.graph-view>.graph-controls{bottom:67px}.selected-node-strip{height:58px;flex:0 0 58px;display:flex;align-items:center;gap:9px;padding:0 12px;border-top:1px solid var(--line);background:#fff}.selected-node-strip>span:nth-child(2){flex:1;min-width:0}.selected-node-strip small,.selected-node-strip strong{display:block}.selected-node-strip small{font-size:8px;color:var(--muted)}.selected-node-strip strong{font:600 10px 'IBM Plex Mono';margin-top:2px}.selected-node-strip>button{display:flex;align-items:center;gap:5px;color:var(--blue);font-size:9px}.graph-feedback .kg-details{position:absolute;z-index:8;left:225px;right:0;bottom:0;height:210px;background:#fff;box-shadow:0 -12px 28px rgba(27,49,60,.12)}
    .assistant-center-stack{min-width:0;min-height:0;display:grid;grid-template-rows:minmax(260px,44%) minmax(330px,56%);gap:12px}.assistant-ifc-model{min-height:0;border:1px solid var(--line);border-radius:4px}.assistant-center-stack .chat-panel{min-height:0}.side-tab-switch{display:flex;background:#f0f4f5;padding:2px}.side-tab-switch button{padding:5px 8px;font-size:9px;color:var(--muted)}.side-tab-switch button.active{background:#fff;color:var(--blue);box-shadow:0 1px 4px rgba(20,48,61,.12)}.asset-brief-content{padding:0 2px}.asset-title{display:flex;align-items:center;gap:9px;padding:14px 2px;border-bottom:1px solid var(--line)}.asset-title>span:nth-child(2){flex:1}.asset-title strong,.asset-title small{display:block}.asset-title strong{font:600 12px 'IBM Plex Mono'}.asset-title small{font-size:9px;color:var(--muted);margin-top:3px}.asset-facts{padding:6px 0}.asset-facts>span{display:grid;grid-template-columns:90px 1fr;gap:8px;padding:8px 4px;border-bottom:1px solid #edf1f2}.asset-facts small{font-size:9px;color:var(--muted)}.asset-facts strong{font-size:10px}.brief-section{margin-top:12px;border-top:1px solid var(--line);padding-top:12px}.brief-section>div{display:flex;align-items:center;justify-content:space-between;margin-bottom:7px}.brief-section>div>strong{font-size:10px}.brief-section>button{width:100%;display:flex;align-items:center;gap:7px;text-align:left;padding:8px 5px;border-bottom:1px solid #edf1f2;color:var(--blue);font-size:9px}.brief-section>button span{flex:1;color:var(--ink)}.brief-section ol{list-style:none;margin:0;padding:0}.brief-section li{display:flex;gap:9px;padding:8px 4px;border-bottom:1px solid #edf1f2}.brief-section time{font:8px 'IBM Plex Mono';color:var(--muted)}.brief-section li strong,.brief-section li small{display:block}.brief-section li strong{font-size:9px}.brief-section li small{font-size:8px;color:var(--muted);margin-top:2px}
    @media(max-width:1350px){.feedback-three-column{grid-template-columns:205px minmax(500px,1fr) 285px}.graph-filterbar{gap:6px}.graph-filterbar label{font-size:8px}.assistant-layout{grid-template-columns:205px minmax(500px,1fr) 285px}}
    @media(max-width:1050px){.room-facts{grid-template-columns:repeat(2,1fr)}.room-facts .wide{grid-column:span 2}.service-map{grid-template-columns:150px 80px 1fr}.service-zones{grid-template-columns:1fr}.modal-backdrop{padding:15px}.graph-relation-cards{grid-template-columns:1fr}.document-preview-shell,.drawing-preview-shell{width:min(760px,70vw);min-width:520px}.home-feedback-grid{grid-template-columns:1fr;height:auto;min-height:0}.home-feedback-grid .campus-panel{min-height:500px}.home-feedback-grid .home-right-stack{min-height:570px}.feedback-three-column{grid-template-columns:205px minmax(500px,1fr)}.feedback-results{display:none}.assistant-center-stack{grid-template-rows:320px 520px}}
  `}</style>;
}
export const AIDemo = () => {
  const [page, setPage] = useState<Page>("login");
  const [demoAlarm, setDemoAlarm] = useState<AirflowAlarmContext | null>(null);
  const navigateNormally = (nextPage: Page) => {
    setDemoAlarm(null);
    setPage(nextPage);
  };
  const content = useMemo(() => {
    if (page === "home") return <Home startAirflowDemo={() => { setDemoAlarm(airflowAlarm); setPage("graph"); }} />;
    if (page === "drawings") return <Drawings goGraph={() => navigateNormally("graph")} />;
    if (page === "graph") return <KnowledgeGraph key={demoAlarm?.alarmId || "standard-graph"} demoAlarm={demoAlarm} goAssistant={() => setPage("assistant")} />;
    if (page === "assistant") return <Assistant key={demoAlarm?.alarmId || "standard-assistant"} goGraph={() => setPage("graph")} demoAlarm={demoAlarm} />;
    return null;
  }, [page, demoAlarm]);
  if (page === "login") return <><Login onLogin={() => navigateNormally("home")} /><Styles /><EnhancementStyles /></>;
  return <><Shell page={page} setPage={navigateNormally}>{content}</Shell><Styles /><EnhancementStyles /><style>{".side-brand small{font-size:12px;font-weight:600;line-height:1.5;letter-spacing:.12em}.room-pop>svg{width:18px!important;height:18px!important;flex:0 0 18px}@media(max-width:1350px) and (min-width:1181px){.page{padding-left:18px;padding-right:18px}.drawing-layout{grid-template-columns:190px minmax(440px,1fr) 270px}.assistant-layout{grid-template-columns:195px minmax(440px,1fr) 270px}.conversation-list{padding-left:10px;padding-right:10px}.evidence-panel{padding-left:9px;padding-right:9px}}"}</style></>;
};
function Styles() {
  return <style>{"\n  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Noto+Sans+SC:wght@400;500;600;700&family=Noto+Serif+SC:wght@600;700&display=swap');\n  :root{--canvas:#f4f6f7;--surface:#fff;--ink:#1f2a30;--muted:#667680;--line:#d7dee2;--blue:#2d6f93;--deep:#174760;--green:#2d8061;--amber:#c38a2e;--red:#b94b45;--offline:#89949a;--shadow:0 12px 40px rgba(36,55,65,.08)}\n  *{box-sizing:border-box}button,input,textarea,select{font:inherit}button{color:inherit}.login-shell,.app-shell{font-family:'Noto Sans SC',sans-serif;color:var(--ink);width:100%;height:100vh;min-height:720px;background:var(--canvas);overflow:hidden}button{border:0;background:none;cursor:pointer}.login-shell{position:relative;display:grid;place-items:center}.login-bg{position:absolute;inset:0;background-image:url('https://storage.googleapis.com/storage.magicpath.ai/component-assets/446098326446829568/446098326446829569/a3ee9b3380a94fada3e1f8861ba06e165492c28fde99ce7f2007f261e03e9ad1.png');background-size:cover;background-position:center;filter:grayscale(1);transform:scale(1.015)}.login-wash{position:absolute;inset:0;background:linear-gradient(110deg,rgba(244,246,247,.34),rgba(244,246,247,.6) 58%,rgba(23,71,96,.13));backdrop-filter:contrast(.86)}\n  .login-brand{position:absolute;left:46px;top:36px;display:flex;align-items:center;gap:12px}.login-brand strong,.side-brand strong{font-family:'Noto Serif SC',serif;font-size:17px;letter-spacing:.08em}.login-brand small,.side-brand small{display:block;font:500 8px/1.7 'IBM Plex Mono';letter-spacing:.18em;color:#667680}.brand-mark{width:40px;height:38px;display:flex;align-items:flex-end;gap:3px}.brand-mark span{display:block;width:9px;background:var(--deep);transform:skewY(-28deg)}.brand-mark span:nth-child(1){height:18px}.brand-mark span:nth-child(2){height:29px}.brand-mark span:nth-child(3){height:22px}.login-card{position:relative;width:426px;padding:42px 44px 28px;background:rgba(255,255,255,.76);border:1px solid rgba(255,255,255,.88);box-shadow:0 30px 90px rgba(27,49,60,.2);backdrop-filter:blur(18px);border-radius:3px}.login-kicker,.eyebrow{font:600 10px/1.4 'IBM Plex Mono';letter-spacing:.16em;color:var(--blue)}.login-card h1{font:700 34px/1.28 'Noto Serif SC';letter-spacing:.025em;margin:12px 0 10px}.login-card>p{font-size:13px;color:var(--muted);line-height:1.7;margin:0 0 25px}.login-card form>label{display:block;font-size:12px;font-weight:600;margin:15px 0 0}.login-card input:not([type=checkbox]){display:block;width:100%;height:45px;margin-top:7px;padding:0 13px;border:1px solid #cbd4d9;border-radius:3px;background:rgba(255,255,255,.84);outline:0}.login-card input:focus{border-color:var(--blue);box-shadow:0 0 0 3px rgba(45,111,147,.12)}.login-options{display:flex;justify-content:space-between;align-items:center;margin:14px 0 18px}.remember{display:flex!important;align-items:center;gap:7px;margin:0!important;font-weight:400!important;color:var(--muted)}.remember input{accent-color:var(--blue)}.text-button{color:var(--blue);font-size:12px}.primary{height:40px;padding:0 16px;background:var(--deep);color:#fff;border-radius:3px;display:inline-flex;align-items:center;justify-content:center;gap:8px;font-weight:600;font-size:13px;box-shadow:0 5px 14px rgba(23,71,96,.18)}.primary:hover{background:#103d55}.primary.small{height:36px}.login-button{width:100%;height:48px}.spinner{width:15px;height:15px;border:2px solid rgba(255,255,255,.35);border-top-color:#fff;border-radius:50%;animation:spin .7s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}.login-foot{display:flex;justify-content:space-between;margin-top:25px;padding-top:18px;border-top:1px solid rgba(102,118,128,.2);font:500 9px 'IBM Plex Mono';color:var(--muted);letter-spacing:.08em}.login-caption{position:absolute;bottom:30px;left:42px;right:42px;display:flex;justify-content:space-between;font:500 9px 'IBM Plex Mono';letter-spacing:.12em;color:#50616a}\n  .app-shell{display:flex}.sidebar{width:228px;flex:0 0 228px;background:#1d2d35;color:#edf3f5;display:flex;flex-direction:column;padding:24px 15px 16px}.side-brand{display:flex;text-align:left;align-items:center;gap:10px;color:#fff;padding:0 7px 22px}.brand-mark.inverse{width:32px;height:32px}.brand-mark.inverse span{width:7px;background:#91b8ca}.side-brand small{color:#91a4ad}.side-label{font:500 9px 'IBM Plex Mono';letter-spacing:.16em;color:#758c97;margin:20px 12px 9px}.sidebar nav{display:flex;flex-direction:column;gap:4px}.sidebar nav button{height:46px;border-radius:4px;display:flex;align-items:center;gap:11px;color:#aebdc4;position:relative;padding:0 12px;text-align:left}.sidebar nav button:hover{background:#263a44;color:#fff}.sidebar nav button.active{background:#294859;color:#fff}.sidebar nav button.active i{position:absolute;left:-15px;top:10px;height:26px;width:3px;background:#7fb1c9}.nav-no{font:500 9px 'IBM Plex Mono';color:#637a85;width:18px}.sidebar nav button.active .nav-no{color:#91c0d6}.side-spacer{flex:1}.system-card{margin:12px 3px;background:#263942;border:1px solid #334b56;padding:13px;border-radius:4px;font-size:10px}.system-card-head{display:flex;align-items:center;gap:7px;font-weight:600;margin-bottom:11px}.live-dot{display:inline-block;width:6px;height:6px;background:#55a37f;border-radius:50%;box-shadow:0 0 0 3px rgba(85,163,127,.13)}.system-card>div:not(:first-child){display:flex;justify-content:space-between;color:#8fa2ab;margin-top:8px}.system-card b{font-weight:500;color:#d8e2e6}.system-card .demo-text{color:#ddb86e}.side-user{border-top:1px solid #32454e!important;margin-top:10px;padding:15px 5px 0;display:flex;align-items:center;text-align:left;color:#fff;gap:9px}.avatar{width:31px;height:31px;border-radius:2px;background:#36596b;display:grid;place-items:center;font:600 10px 'IBM Plex Mono';color:#fff}.side-user>span:nth-child(2){flex:1}.side-user strong{font-size:11px;display:block}.side-user small{font-size:9px;color:#8fa2ab}.main-shell{min-width:0;flex:1;display:flex;flex-direction:column}.topbar{height:64px;flex:0 0 64px;background:#fff;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:center;padding:0 26px}.topbar>div:first-child{display:flex;gap:6px;font-size:12px}.crumb{color:#93a0a7}.top-actions{display:flex;align-items:center;gap:13px}.global-search{width:260px;height:34px;border:1px solid var(--line);border-radius:3px;display:flex;align-items:center;gap:8px;padding:0 9px;color:#86939a;font-size:10px}.global-search span{flex:1}.global-search kbd{border:1px solid #d5dde0;border-radius:3px;padding:2px 4px;background:#f4f6f7;font:9px 'IBM Plex Mono'}.icon-button{width:34px;height:34px;border:1px solid var(--line);border-radius:3px;display:grid;place-items:center;position:relative;background:#fff}.icon-button:hover,.outline:hover{border-color:#9eb5c0;background:#f8fafb}.icon-button em{position:absolute;right:-5px;top:-5px;background:var(--red);color:#fff;width:16px;height:16px;display:grid;place-items:center;border-radius:50%;font:600 8px 'IBM Plex Mono'}.top-time{padding-left:2px}.top-time span,.top-time small{display:block;text-align:right}.top-time span{font-size:10px;font-weight:600}.top-time small{font-size:9px;color:var(--muted)}.logout{width:30px;color:#829099}.content{flex:1;min-height:0;overflow:auto}.page{min-height:100%;padding:22px 24px 26px}.page-head{display:flex;align-items:flex-end;justify-content:space-between;margin-bottom:18px}.page-head.compact{align-items:center;margin-bottom:14px}.page-head h2{font:700 25px/1.2 'Noto Serif SC';margin:5px 0 3px;letter-spacing:.01em}.page-head p{font-size:11px;color:var(--muted);margin:0}.head-tools{display:flex;align-items:center;gap:8px}.badge{display:inline-flex;align-items:center;gap:6px;border-radius:2px;padding:4px 7px;font:500 9px 'IBM Plex Mono';white-space:nowrap}.badge-blue{background:#e9f2f6;color:#246684}.badge-green{background:#e8f2ed;color:#287356}.badge-amber{background:#f6efe1;color:#9b6d21}.badge-red{background:#f7e9e8;color:#a33e39}.badge-gray{background:#edf1f3;color:#69777e}.outline{height:34px;border:1px solid var(--line);background:#fff;border-radius:3px;padding:0 10px;display:flex;gap:7px;align-items:center;font-size:10px}.panel{background:#fff;border:1px solid var(--line);border-radius:4px;box-shadow:0 2px 8px rgba(39,61,72,.025)}.panel-head{display:flex;align-items:center;justify-content:space-between;padding:15px 17px 12px}.panel-head small{display:block;font:500 9px 'IBM Plex Mono';letter-spacing:.12em;color:#829097;text-transform:uppercase}.panel-head h3{font-size:14px;margin:3px 0 0}.panel-head h3 em{font-style:normal;color:var(--blue)}.metric-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}.metric-card{background:#fff;border:1px solid var(--line);border-radius:4px;min-height:104px;padding:16px;text-align:left;display:flex;align-items:flex-start;gap:12px;box-shadow:0 2px 9px rgba(39,61,72,.025)}.metric-card:hover{border-color:#a8bec8;transform:translateY(-1px)}.metric-card>svg{color:#9aa7ad;margin:3px 0 0 auto}.metric-icon{width:37px;height:37px;display:grid;place-items:center;border-radius:3px}.metric-icon.blue{background:#e9f2f6;color:var(--blue)}.metric-icon.teal{background:#e7f2f0;color:#28786c}.metric-icon.red{background:#f8e8e7;color:var(--red)}.metric-icon.amber{background:#f8efdf;color:var(--amber)}.metric-copy{display:block}.metric-copy small{display:block;font-size:10px;color:var(--muted)}.metric-copy>strong{display:block;font:600 27px/1.3 'IBM Plex Mono';margin:3px 0}.metric-copy strong em{font:500 10px 'Noto Sans SC';font-style:normal;margin-left:5px;color:var(--muted)}.metric-copy>span{font-size:9px;color:#7a888f}.red-text{color:var(--red)}.green-text{color:var(--green)}.good-dot{display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--green);margin-right:4px}.home-main-grid{display:grid;grid-template-columns:minmax(0,1.7fr) minmax(300px,.7fr);gap:12px;margin-top:12px}.campus-panel,.alarm-panel{height:386px}.floor-map{height:323px;margin:0 17px 16px;position:relative;overflow:hidden;border-top:1px solid #edf1f2;background:#f9fbfb}.floor-map svg{width:100%;height:100%}.seg{display:flex;background:#f0f3f4;padding:2px;border-radius:3px}.seg button{font-size:9px;padding:5px 9px;border-radius:2px;color:#6f7d84}.seg button.active{background:#fff;color:var(--deep);box-shadow:0 1px 3px rgba(0,0,0,.08);font-weight:600}.map-outline{fill:#f7fafb;stroke:#607984;stroke-width:2}.map-line{fill:none;stroke:#bac7cd;stroke-width:1}.map-room{fill:#e9f0f3;stroke:#718892}.selected-room{fill:#dbeaf1;stroke:#2d6f93;stroke-width:2}.warning-room{fill:#f6efe1;stroke:#c38a2e}.map-title{font:600 13px 'Noto Sans SC';fill:#174760}.map-sub{font:9px 'Noto Sans SC';fill:#5b727d}.map-small{font:10px 'Noto Sans SC';fill:#657780}.pin-ok{fill:#2d8061}.pin-warn{fill:#c38a2e}.pin-alarm{fill:#b94b45}.map-legend{position:absolute;left:12px;bottom:11px;background:rgba(255,255,255,.86);border:1px solid var(--line);padding:7px 9px;display:flex;gap:12px;font-size:8px}.map-legend span{display:flex;align-items:center;gap:4px}.map-legend i{width:6px;height:6px;border-radius:50%}.room-pop{position:absolute;right:13px;top:14px;width:228px;background:#fff;border:1px solid #aec1ca;box-shadow:0 10px 28px rgba(36,55,65,.12);display:flex;align-items:center;text-align:left;padding:11px}.room-pop>span{flex:1}.room-pop strong,.room-pop small{display:block}.room-pop strong{font-size:11px;margin:6px 0 2px}.room-pop small{font-size:8px;color:var(--red)}.room-pop>svg{color:var(--blue)}.alarm-summary{display:grid;grid-template-columns:1fr 1fr 86px;gap:4px;border-top:1px solid #edf1f2;border-bottom:1px solid #edf1f2;padding:14px 17px}.alarm-summary>div:not(.ring){padding-right:8px}.alarm-summary strong{display:block;font:600 24px 'IBM Plex Mono';color:var(--red)}.alarm-summary span{font-size:9px;color:var(--muted)}.ring{width:56px;height:56px;border-radius:50%;background:conic-gradient(var(--green) 0 78%,#e7edef 78%);display:grid;place-items:center;position:relative}.ring:after{content:'';position:absolute;width:42px;height:42px;border-radius:50%;background:#fff}.ring span{z-index:1;font:600 10px 'IBM Plex Mono';color:var(--green)}.alarm-list{padding:4px 12px}.alarm-list button{display:flex;width:100%;align-items:flex-start;text-align:left;padding:11px 4px;border-bottom:1px solid #eef2f3;gap:9px}.alarm-list button:hover{background:#fafcfc}.sev{width:3px;height:30px;border-radius:2px}.sev.high{background:var(--red)}.sev.mid{background:var(--amber)}.alarm-list button span{flex:1}.alarm-list strong,.alarm-list small{display:block}.alarm-list strong{font-size:10px}.alarm-list small{font-size:8px;color:var(--muted);margin-top:3px}.alarm-list time{font:9px 'IBM Plex Mono';color:#8d9aa0}.home-bottom-grid{display:grid;grid-template-columns:1.7fr .7fr;gap:12px;margin-top:12px}.energy-panel,.work-panel{height:214px}.energy-chart{height:145px;display:flex;position:relative;padding:7px 18px 23px 44px}.axis{position:absolute;left:18px;top:4px;bottom:28px;display:flex;flex-direction:column;justify-content:space-between;font:8px 'IBM Plex Mono';color:#93a0a6}.bars{display:flex;flex:1;align-items:flex-end;gap:10px;border-bottom:1px solid var(--line);background:repeating-linear-gradient(to bottom,#fff 0,#fff 27px,#edf1f2 28px)}.bars>div{height:100%;flex:1;display:flex;align-items:flex-end;position:relative}.bars span{display:block;width:100%;background:#8fb1c1;border-radius:2px 2px 0 0}.bars span.peak{background:var(--blue)}.bars small{position:absolute;bottom:-17px;width:100%;text-align:center;font:8px 'IBM Plex Mono';color:#8f9ba1}.chart-note{position:absolute;right:25px;top:5px;background:#fff;border:1px solid var(--line);padding:5px 8px;box-shadow:0 4px 12px rgba(0,0,0,.06)}.chart-note b,.chart-note span{display:block}.chart-note b{font:600 12px 'IBM Plex Mono';color:var(--blue)}.chart-note span{font-size:8px;color:var(--muted)}.work-body{display:flex;align-items:center;justify-content:center;gap:28px;height:145px}.work-donut{width:105px;height:105px;border-radius:50%;background:conic-gradient(var(--green) 0 64%,var(--blue) 64% 77%,var(--amber) 77%);display:grid;place-items:center;position:relative}.work-donut:after{content:'';position:absolute;width:72px;height:72px;background:#fff;border-radius:50%}.work-donut div{z-index:1;text-align:center}.work-donut strong{display:block;font:600 22px 'IBM Plex Mono'}.work-donut span{font-size:8px;color:var(--muted)}.work-legend{display:flex;flex-direction:column;gap:10px}.work-legend span{font-size:9px;color:var(--muted)}.work-legend i{display:inline-block;width:7px;height:7px;margin-right:7px}.work-legend b{color:var(--ink);font:600 12px 'IBM Plex Mono';margin-right:3px}.done{background:var(--green)}.doing{background:var(--blue)}.todo{background:var(--amber)}\n  .drawing-layout{display:grid;grid-template-columns:236px minmax(520px,1fr) 330px;gap:12px;height:calc(100vh - 140px);min-height:650px}.tree-panel,.result-panel{overflow:hidden}.tree-search,.conv-search{height:34px;margin:0 14px 14px;border:1px solid var(--line);background:#fafbfb;display:flex;align-items:center;gap:7px;padding:0 9px;color:#95a0a5;font-size:9px}.tree{padding:0 10px;font-size:10px}.tree button{display:flex;align-items:center;gap:6px;width:100%;padding:7px 8px;text-align:left}.tree button>svg:first-child{transform:rotate(90deg)}.tree>div{padding-left:12px}.tree>div>div{padding-left:15px;border-left:1px solid #dce3e6;margin-left:6px}.tree button.selected{background:#e9f2f6;color:var(--deep);font-weight:600}.tree button b{margin-left:auto;font:500 9px 'IBM Plex Mono'}.discipline-list{margin:18px 15px;border-top:1px solid var(--line);padding-top:15px}.discipline-list>small,.kg-section>small{font:600 9px 'IBM Plex Mono';letter-spacing:.12em;color:#89969c}.discipline-list button{display:flex;width:100%;justify-content:space-between;padding:8px 7px;font-size:10px}.discipline-list button.active{color:var(--blue);background:#f0f5f7;font-weight:600}.discipline-list b{font:500 9px 'IBM Plex Mono'}.drawing-center{display:flex;min-width:0;flex-direction:column;gap:12px}.nl-search{height:82px;display:grid;grid-template-columns:38px 1fr auto;align-items:center;padding:10px 12px;column-gap:8px}.ai-square{width:35px;height:35px;background:#e8f1f5;color:var(--blue);display:grid;place-items:center;border-radius:3px}.nl-search input{height:36px;border:0;border-bottom:1px solid #9eb1ba;outline:0;font-size:12px}.nl-search input:focus{border-color:var(--blue)}.nl-search .primary{height:36px}.query-hint{grid-column:2/-1;display:flex;align-items:center;gap:5px;font-size:8px;color:var(--muted)}.drawing-canvas{flex:1;min-height:0;display:flex;flex-direction:column}.drawing-toolbar{height:55px;display:flex;align-items:center;justify-content:space-between;padding:0 12px;border-bottom:1px solid var(--line)}.drawing-toolbar>div{display:flex;align-items:center;gap:8px}.drawing-toolbar strong{font:600 10px 'IBM Plex Mono'}.drawing-toolbar span{font-size:10px;color:var(--muted)}.drawing-toolbar select{height:32px;border:1px solid var(--line);background:#fff;border-radius:3px;font-size:9px;padding:0 8px}.blueprint{flex:1;min-height:0;position:relative;overflow:hidden;background:#eef2f3}.blueprint svg{width:100%;height:100%;object-fit:contain}.zoom-tools{position:absolute;right:12px;bottom:12px;background:#fff;border:1px solid var(--line);display:flex;box-shadow:0 4px 12px rgba(0,0,0,.05)}.zoom-tools button,.zoom-tools span{width:30px;height:28px;display:grid;place-items:center;border-right:1px solid var(--line);font-size:11px}.zoom-tools span{width:42px;border:0;font:8px 'IBM Plex Mono'}.result-filter{margin:0 14px 6px;padding:8px 0;border-top:1px solid #edf1f2;display:flex;justify-content:space-between;font-size:8px;color:var(--muted)}.drawing-results{padding:0 8px}.drawing-results>button{width:100%;display:grid;grid-template-columns:28px 1fr;text-align:left;padding:11px 7px;border-bottom:1px solid #edf1f2;position:relative}.drawing-results>button.selected{background:#eef5f8}.drawing-results>button.selected>i{position:absolute;left:0;top:9px;bottom:9px;width:3px;background:var(--blue)}.doc-index{font:500 9px 'IBM Plex Mono';color:#9ba6ab}.drawing-results strong,.drawing-results small{display:block}.drawing-results strong{font-size:10px;margin-bottom:3px}.drawing-results small{font:8px 'IBM Plex Mono';color:#7e8b91;margin-bottom:6px}.drawing-results>button span span{display:flex;align-items:center;gap:8px}.drawing-results em{font:500 8px 'IBM Plex Mono';font-style:normal;color:var(--muted)}.version-note{margin:12px;background:#f4f7f8;padding:11px;display:flex;gap:9px;color:var(--blue)}.version-note strong,.version-note small{display:block}.version-note strong{font-size:9px}.version-note small{font-size:8px;line-height:1.5;color:var(--muted);margin-top:3px}\n  .kg-layout{display:grid;grid-template-columns:225px minmax(0,1fr);gap:12px;height:calc(100vh - 140px);min-height:650px}.kg-sidebar{padding:14px;overflow:auto}.kg-search{height:36px;border:1px solid var(--line);display:flex;align-items:center;gap:7px;padding:0 9px}.kg-search input{border:0;outline:0;width:100%;font:10px 'IBM Plex Mono'}.entity-focus{text-align:center;padding:20px 10px;border-bottom:1px solid var(--line)}.entity-focus>small{display:block;font:500 8px 'IBM Plex Mono';color:var(--muted);letter-spacing:.12em}.entity-symbol{width:54px;height:54px;margin:12px auto 8px;background:#e7f0f4;color:var(--deep);border:1px solid #aac1cb;display:grid;place-items:center;font:600 12px 'IBM Plex Mono';clip-path:polygon(50% 0,93% 25%,93% 75%,50% 100%,7% 75%,7% 25%)}.entity-focus strong,.entity-focus span{display:block}.entity-focus strong{font:600 11px 'IBM Plex Mono'}.entity-focus span{font-size:9px;color:var(--muted);margin:3px 0 9px}.kg-section{padding:15px 2px;border-bottom:1px solid var(--line)}.kg-section>label:not(.check-row){display:flex;justify-content:space-between;font-size:9px;margin-top:12px}.kg-section input[type=range]{width:100%;height:3px;accent-color:var(--blue)}.range-label{display:flex;justify-content:space-between;font:8px 'IBM Plex Mono';color:var(--muted)}.check-row{display:flex;align-items:center;gap:7px;font-size:9px;margin-top:10px}.check-row input{accent-color:var(--blue)}.check-row i{width:7px;height:7px;border-radius:50%}.check-row span{flex:1}.check-row b{font:500 9px 'IBM Plex Mono'}.relation-key{display:flex;flex-direction:column;gap:9px;margin-top:12px}.relation-key span{display:flex;align-items:center;gap:9px;font-size:9px}.line{display:block;width:28px;border-top:2px solid #5d88a0}.line.blue{border-color:#2d6f93}.line.dash{border-top-style:dashed;border-color:#89949a}.source-note{margin-top:14px;display:flex;gap:8px;background:#f3f6f7;padding:10px;color:var(--blue)}.source-note strong,.source-note small{display:block}.source-note strong{font-size:9px}.source-note small{font-size:7px;color:var(--muted);margin-top:3px}.kg-main{min-width:0;display:flex;flex-direction:column;overflow:hidden}.kg-split{display:grid;grid-template-columns:.9fr 1.1fr;min-height:0;flex:1}.model-view,.graph-view{position:relative;min-width:0;overflow:hidden}.model-view{border-right:1px solid var(--line);background:#f2f5f6}.model-view>svg,.graph-view>svg{width:100%;height:calc(100% - 42px)}.model-title{height:42px;padding:0 12px;display:flex;align-items:center;justify-content:space-between;background:rgba(255,255,255,.9);border-bottom:1px solid var(--line);font-size:9px}.model-title>span{display:flex;align-items:center;gap:7px;font-weight:600}.model-title>div{display:flex;gap:3px}.model-title button{font-size:8px;padding:5px 7px;color:var(--muted)}.model-title button.mini-active{background:#e9f2f6;color:var(--blue)}.model-controls,.graph-controls{position:absolute;left:10px;bottom:10px;display:flex;background:#fff;border:1px solid var(--line)}.model-controls button,.graph-controls button{height:27px;min-width:28px;border-right:1px solid var(--line);font-size:10px}.model-stats{position:absolute;right:10px;bottom:10px;background:rgba(255,255,255,.9);border:1px solid var(--line);display:flex}.model-stats span{font-size:7px;padding:6px 8px;border-left:1px solid var(--line)}.model-stats b{font:600 9px 'IBM Plex Mono';color:var(--blue)}.model-focus{filter:drop-shadow(0 0 5px rgba(45,111,147,.2))}.graph-view{background:#fafcfc}.graph-controls span{height:27px;padding:0 8px;display:flex;align-items:center;font:8px 'IBM Plex Mono';color:var(--muted)}.kg-node{cursor:pointer}.kg-node rect{fill:#fff;stroke:#7c929d;stroke-width:1.3}.kg-node circle{fill:#7c929d}.kg-node.node-primary rect{fill:#e6f1f5;stroke:#2d6f93;stroke-width:2}.kg-node.node-primary circle{fill:#2d6f93}.kg-node.node-space rect{fill:#f7f0e2;stroke:#c38a2e}.kg-node.node-space circle{fill:#c38a2e}.kg-node.node-water rect{fill:#ebf1f4;stroke:#708e9d}.kg-node.node-water circle{fill:#708e9d}.kg-node.node-sensor rect{fill:#e9f3ee;stroke:#2d8061}.kg-node.node-sensor circle{fill:#2d8061}.kg-node.selected rect{stroke:#174760;stroke-width:3;filter:drop-shadow(0 4px 5px rgba(30,67,84,.16))}.node-label{font:600 10px 'IBM Plex Mono';fill:#263840}.node-kind{font:8px 'Noto Sans SC';fill:#718087}.edge-label{font:7px 'IBM Plex Mono';fill:#72828a;letter-spacing:.04em}.kg-details{height:210px;flex:0 0 210px;border-top:1px solid var(--line);overflow:auto}.detail-head{height:57px;padding:0 14px;display:flex;align-items:center;gap:22px;border-bottom:1px solid var(--line)}.detail-head>div:first-child{display:flex;align-items:center;gap:9px;min-width:210px}.detail-kind{width:32px;height:32px;display:grid;place-items:center;background:#e8f1f5;color:var(--blue)}.detail-head small{display:block;font-size:8px;color:var(--muted)}.detail-head h3{font:600 11px 'IBM Plex Mono';margin:2px 0}.detail-tabs{display:flex;align-self:stretch;flex:1}.detail-tabs button{padding:0 14px;font-size:9px;position:relative}.detail-tabs button.active{color:var(--blue);font-weight:600}.detail-tabs button.active:after{content:'';position:absolute;bottom:0;left:12px;right:12px;height:2px;background:var(--blue)}.detail-tabs b{font:500 7px 'IBM Plex Mono';background:#edf1f2;padding:2px 4px;margin-left:3px}.property-grid{display:grid;grid-template-columns:1.4fr .8fr 1.1fr .8fr 1.2fr;padding:18px 14px}.property-grid span{border-right:1px solid var(--line);padding:0 13px}.property-grid span:last-child{border:0}.property-grid small,.property-grid strong{display:block}.property-grid small{font-size:8px;color:var(--muted);margin-bottom:5px}.property-grid strong{font:500 9px 'IBM Plex Mono';white-space:nowrap}.amber-text{color:var(--amber)!important}.point-table{padding:8px 14px;font-size:8px}.point-table>div{display:grid;grid-template-columns:.7fr 1.4fr .7fr .6fr;align-items:center;padding:5px 8px;border-bottom:1px solid #edf1f2}.point-table .table-head{background:#f4f7f8;color:var(--muted);font-weight:600}.point-table code{color:var(--blue);font:600 8px 'IBM Plex Mono'}.point-table strong{font:500 8px 'IBM Plex Mono'}.relation-cards{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;padding:13px}.relation-cards>div{background:#f6f8f9;border:1px solid #e3e8ea;padding:10px}.relation-cards strong,.relation-cards span{display:block}.relation-cards strong{font:600 9px 'IBM Plex Mono';margin:7px 0 3px}.relation-cards>div>span{font-size:8px;color:var(--muted)}\n  .assistant-layout{display:grid;grid-template-columns:238px minmax(520px,1fr) 320px;gap:12px;height:calc(100vh - 140px);min-height:650px}.conversation-list{padding:14px;display:flex;flex-direction:column;overflow:hidden}.new-chat{width:100%;flex:0 0 38px}.new-chat span{font-size:19px;font-weight:300}.conv-search{margin:12px 0}.group-label{font:500 8px 'IBM Plex Mono';letter-spacing:.12em;color:#8b989e;margin:6px 7px}.conv{display:flex;align-items:flex-start;gap:8px;padding:10px 7px;text-align:left;border-radius:3px;color:#718087}.conv.active{background:#eaf2f5;color:var(--blue)}.conv>span{flex:1}.conv strong,.conv small{display:block}.conv strong{font-size:9px;color:var(--ink)}.conv small{font-size:7px;color:var(--muted);margin-top:4px}.assistant-cap{margin-top:auto;background:#f2f6f7;padding:11px;display:flex;gap:8px;color:var(--blue)}.assistant-cap strong,.assistant-cap small{display:block}.assistant-cap strong{font-size:9px}.assistant-cap small{font-size:8px;line-height:1.5;color:var(--muted);margin-top:3px}.chat-panel{display:flex;flex-direction:column;min-width:0;overflow:hidden}.chat-head{height:58px;flex:0 0 58px;border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;padding:0 16px}.chat-head>div{display:flex;align-items:center;gap:9px}.chat-head h3{font-size:12px;margin:0}.chat-head small{font-size:8px;color:var(--muted)}.ai-orb{width:34px;height:34px;border-radius:50%;background:#174760;color:#fff;display:grid;place-items:center;box-shadow:0 0 0 5px #e8f0f3}.ai-orb.small{width:28px;height:28px;box-shadow:none;flex:0 0 28px}.messages{flex:1;overflow:auto;padding:18px 20px 8px;background:linear-gradient(180deg,#fbfcfc,#fff)}.message{display:flex;gap:10px;margin-bottom:18px}.user-message{justify-content:flex-end}.user-message>div{max-width:70%;background:#e8f1f5;padding:10px 13px;border-radius:7px 2px 7px 7px}.message strong,.message span{display:block}.user-message strong{font-size:8px;color:var(--blue);margin-bottom:4px}.user-message div>span{font-size:10px;line-height:1.55}.ai-message>div{max-width:calc(100% - 40px)}.answer{border:1px solid var(--line);border-radius:2px;padding:13px 14px}.answer-head{display:flex;align-items:center;justify-content:space-between}.answer-head strong{font-size:11px}.answer>p{font-size:9px;line-height:1.7;color:#53656e}.answer code{font:600 8px 'IBM Plex Mono';color:var(--blue);background:#edf3f5;padding:2px 4px}.answer ol{list-style:none;padding:0;margin:10px 0}.answer li{display:flex;align-items:flex-start;gap:9px;border-top:1px solid #edf1f2;padding:8px 0}.answer li>span{font:600 8px 'IBM Plex Mono';color:var(--blue);margin-top:2px}.answer li>div{flex:1}.answer li strong{font-size:9px}.answer li p{font-size:8px;color:var(--muted);margin:3px 0;line-height:1.5}.answer-actions{display:flex;align-items:center;border-top:1px solid #edf1f2;padding-top:9px;gap:7px}.answer-actions button{border:1px solid var(--line);height:29px;padding:0 8px;display:flex;align-items:center;gap:5px;font-size:8px}.answer-actions>span{margin-left:auto;font:7px 'IBM Plex Mono';color:var(--muted)}.suggestions{display:flex;gap:6px;overflow:hidden;padding:8px 15px 6px}.suggestions button{display:flex;align-items:center;gap:5px;white-space:nowrap;border:1px solid var(--line);background:#fff;padding:6px 8px;font-size:8px;color:#596b74}.suggestions button:hover{border-color:var(--blue);color:var(--blue)}.composer{margin:7px 15px 14px;border:1px solid #a9bbc3;box-shadow:0 5px 18px rgba(42,67,79,.08);border-radius:4px;padding:9px}.composer:focus-within{border-color:var(--blue);box-shadow:0 0 0 3px rgba(45,111,147,.1)}.composer textarea{display:block;width:100%;height:39px;resize:none;border:0;outline:0;font-size:10px}.composer>div{display:flex;justify-content:space-between;align-items:center}.composer>div>span{display:flex;align-items:center;gap:5px}.composer button{height:25px;border:1px solid var(--line);padding:0 7px;display:flex;align-items:center;gap:5px;font-size:8px}.composer small{font-size:7px;color:var(--muted)}.composer .send{width:29px;height:29px;padding:0;display:grid;place-items:center;background:var(--deep);color:#fff;border-color:var(--deep)}.evidence-panel{padding:0 13px 13px;overflow:auto}.evidence-panel>.panel-head{padding-left:2px;padding-right:2px}.confidence{background:#f3f7f8;padding:11px;margin-bottom:10px}.confidence>div{display:flex;justify-content:space-between;align-items:end}.confidence strong{font:600 20px 'IBM Plex Mono';color:var(--green)}.confidence span{font-size:8px;color:var(--muted)}.confidence>span{display:block;height:3px;background:#dbe5e8;margin:8px 0 5px}.confidence>span i{height:100%;display:block;background:var(--green)}.confidence small{font-size:7px;color:var(--muted)}.evidence-list{display:flex;flex-direction:column;gap:6px}.evidence-list button{display:grid;grid-template-columns:34px 1fr 18px;gap:8px;text-align:left;padding:9px;border:1px solid var(--line);position:relative}.evidence-list button.active{border-color:#93afbd;background:#f5f9fa}.source-icon{width:31px;height:36px;display:grid;place-items:center;font:600 8px 'IBM Plex Mono';color:#fff;background:var(--red);clip-path:polygon(0 0,75% 0,100% 22%,100% 100%,0 100%)}.source-icon.code{background:var(--amber)}.source-icon.wo{background:var(--green)}.source-icon.kg{background:var(--blue)}.evidence-list small,.evidence-list strong,.evidence-list p{display:block;margin:0}.evidence-list small{font-size:7px;color:var(--muted)}.evidence-list strong{font-size:9px;margin:2px 0}.evidence-list p{font-size:7px;color:#748289}.evidence-list em{font:500 8px 'IBM Plex Mono';font-style:normal;color:#9aa5aa}.evidence-preview{background:#f3f6f7;margin-top:10px;padding:10px}.evidence-preview>div{display:flex;gap:7px;color:var(--blue)}.evidence-preview strong,.evidence-preview small{display:block}.evidence-preview strong{font-size:8px}.evidence-preview small{font-size:7px;color:var(--muted)}.evidence-preview p{font-size:8px;line-height:1.6;color:#5d6d75}.evidence-preview button{font-size:8px;color:var(--blue);display:flex;align-items:center;gap:5px}\n  @media(max-width:1180px){.sidebar{width:190px;flex-basis:190px}.global-search{display:none}.metric-grid{grid-template-columns:repeat(2,1fr)}.home-main-grid,.home-bottom-grid{grid-template-columns:1fr}.drawing-layout{grid-template-columns:205px minmax(500px,1fr)}.result-panel{display:none}.assistant-layout{grid-template-columns:210px 1fr}.evidence-panel{display:none}.kg-split{grid-template-columns:1fr}.model-view{display:none}.campus-panel,.alarm-panel{height:auto}.page{min-width:780px}}\n  @media(max-width:820px){.sidebar{width:66px;flex-basis:66px;padding:18px 8px}.side-brand>div:last-child,.side-label,.nav-no,.sidebar nav button span:not(.nav-no),.system-card,.side-user>span:nth-child(2),.side-user>svg{display:none}.side-brand{padding:0 8px 18px}.sidebar nav button{justify-content:center;padding:0}.sidebar nav button.active i{left:-8px}.content{overflow:auto}.top-time{display:none}.page{padding:18px;min-width:720px}}\n"}</style>;
}
