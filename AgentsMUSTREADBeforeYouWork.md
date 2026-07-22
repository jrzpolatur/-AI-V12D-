# 🚨 AI Agents MUST READ Before You Work 🚨

欢迎！如果你是一个即将对这个 2D 射击游戏代码库进行开发、重构或修 Bug 的 AI Agent，**请务必在开始动手前仔细阅读本文档**。这里记录了前任 Agent 们在token与泪的调试中总结出的架构陷阱、刁钻 Bug 以及排查指南。

## 1. 核心架构认知
这是一个**权威服务器（Authoritative Server）+ 客户端预测（Client-side Prediction）**架构的游戏。
* **服务端 (`server/authoritative.mjs`)**：Node.js 环境。负责管理房间、WebSocket 连接，并在每帧（30Tick）调用 `GameEngine` 的 `stepServer` 方法来进行权威状态计算，最后将快照（Snapshot）下发给所有客户端。
* **核心引擎 (`src/game/engine.ts`)**：**重中之重！** 这里的代码同时运行在服务端和客户端。你在这里写的任何逻辑，都会被双端执行。
* **网络层 (`src/net/Net.ts`)**：负责客户端收发 WebSocket 消息。
* **UI 与流程 (`src/App.tsx`, `src/components/*`)**：React 负责大厅、选装备和游戏画布的挂载。

## 2. 致命陷阱：`simulatePeer` 与单例上下文复用
在 `engine.ts` 中，为了节省内存和计算资源，服务端在模拟两个玩家（房主 1号 和 加入者 2号）时，**共用同一个 `GameEngine` 实例**。
它通过 `simulatePeer` 方法，在同一个 Tick 内，分别把上下文临时切换给 1 号和 2 号，执行完毕后再切回。

> [!WARNING]
> **极其容易引发 Bug 的设计**：
> 在 `simulatePeer` 中，诸如 `this.player`、`this.activeId`、`this.weaponStates`、`this.guns` 等指针会被来回覆写。如果你在覆盖属性的顺序上出了错，或者忘记在函数末尾将上下文完美还原，会导致**对象污染**。

**历史血泪教训**：
曾有一个 Bug 导致加入者（2号）在客户端按键移动后，只能在极小范围内“鬼畜拉扯”（不断被拉回原地）。
**原因**：
1. `simulatePeer` 的开头执行了 `this.player = player`。
2. 随后代码使用了 `player === this.player` 去判断当前模拟的是不是 1 号，导致条件永远为真。
3. 这使得 2 号被错误地分配了 1 号的 `activeId` 和 `weaponStates`。
4. 当 1 号和 2 号武器不一致时，2 号在 `updatePlayer` 中查找武器状态返回了 `undefined`，进而触发 `TypeError`（比如读取 `clip` 属性）。
5. **未捕获的异常直接导致服务端当前帧的 `stepServer` 崩溃退出！** 2 号的物理移动未执行，环境复原代码也没执行，服务器停摆，客机疯狂重置 2 号的位置，形成拉扯。

## 3. 常见 Bug 症状与排查方向

### 症状 A：单方面“拉扯 / 极小范围移动”
> [!TIP]
> 如果客机画面上本地角色能动一点点，但马上被拽回原地。

**排查方向**：
这说明客户端的本地预测（Prediction）正常执行，但**服务端没有移动该角色**，导致客机应用快照时被拉回。
1. 检查 `takePeerFrame` 是否拿到了客机的输入（WebSocket 通信是否绑定了正确的 `ws.pid`）。
2. 检查 `simulatePeer` 或 `updatePlayer` 中是否发生了抛错（如上述的 TypeError），导致服务端的逻辑中断。
3. 检查是否有诸如 `deadTimer > 0` 的负面状态被错误地持久化，导致服务端拒绝计算该角色的位移。

### 症状 B：Host vs Guest 歧义逻辑（历史遗留陷阱）
> [!CAUTION]
> 之前的 AI 可能错误地将游戏理解为“房主做主机 P2P”的模式，并在代码里硬塞了大量的 `if (this.mode === "host")` 和 `if (this.mode === "guest")`。

**排查方向**：
目前的架构是纯粹的 Authoritative Server。对于 PvP 对战：
* 房主分配的是 `pid = 1`（`selfPid = 1`）。
* 加入者分配的是 `pid = 2`（`selfPid = 2`）。
在客户端，两个角色本质上都是 Thin Client。如果在 `engine.ts` 中遇到两端行为不一致，优先检查是否被无脑加上的 `mode === "host"` 逻辑所破坏。

## 4. 你的工作守则（Code of Conduct）
1. **不要想当然地修改上下文引用**：在 `simulatePeer` 或 `simulateRemote` 中修改任何 `this.xxx` 之前，必须确保在函数退出前以及异常分支里能将它安全还原。
2. **多端思维**：改动 `engine.ts` 时，必须在大脑里跑两遍：这一行代码在 `mode === "server"` 时会怎么表现？在客户端本地预测时又会怎么表现？
3. **不要滥用 try-catch，但要小心隐式崩溃**：服务端的 `stepServer` 是在定时器中高频触发的，一旦某个属性 `undefined` 导致抛错，错误会被 Node.js 吞掉，从而表现为“画面静止”或“拉扯”，不会有明显的崩溃日志。排查时多想一步对象是否可能为空。
4. **加入顺序敏感性**：如果 Bug 描述里带有“加入游戏的先后顺序有关”，死盯着 `pid = 1`（creator） 和 `pid = 2`（joiner） 的分发，以及相关的 `this.player / this.foe` 绑定逻辑。

---

## 5. 核心代码模块与行数速查地图（Agent 必看表）

方便未来的 AI Agent 快速定位与修改相应模块：

### 核心引擎与逻辑 (`src/game/engine.ts`)
* **基地 (Base) 与场景初始化** (`lines ~1020 - 1060`)：`this.base` 和 `this.enemyBase` 的属性设置。注意：在死斗模式或生化模式下，**决不能将 base 设为 null**，而应设置 `hp = Infinity`，否则会引发全盘 `TypeError` 导致黑屏或卡同步。
* **死斗模式 (Deathmatch) 逻辑** (`lines ~1140 - 1263`)：4 人的生成、AI Bot 建立与死斗 kill Limit 初始化。
* **模拟与上下文切换 (`simulatePeer`)** (`lines ~2160 - 2200`)：多端在同一个 Engine 实例上模拟 1号/2号 玩家时的变量切换与恢复逻辑。修改时千万注意不可残留状态污染！
* **玩家移动与按键物理 (`updatePlayer`)** (`lines ~2200 - 2400`)：处理推力、障碍物碰撞、技能冷却等。
* **子弹、射击与伤害结算 (`updateBullets`)** (`lines ~3380 - 3465`)：包含枪械、子弹碰撞、爆炸判定与 `ownerId` 的穿透。
* **手雷与部署物 (Turret/Mine) 逻辑** (`lines ~3467 - 3700`)：部署物的血量、寻找最近目标逻辑与 owner 绑定。
* **燃烧场与毒气场 (`updateEffects`)** (`lines ~4200 - 4250`)：持续性地面伤害，已支持透传 `fx.ownerId` 以正确归属击杀得分。
* **伤害与击杀计分板 (`damagePlayerEntity` / `addScoreFeed`)** (`lines ~4530 - 4660` 与 `lines ~680 - 710`)：控制 `scoreFeed` 与 `killFeed` 的数据推送。
* **复活时间与伤害日志记录 (`recordDamageLog` / `damageLogs`)** (`lines ~657 - 661`, `lines ~1028 - 1063`, `lines ~4990 - 5007`, `lines ~5230 - 5240`, `lines ~5390 - 5420`)：
  - `RESPAWN_TIME = 6` (固定 6 秒复活)，`DAMAGE_LOG_WINDOW = 10` (伤害日志保存 10 秒，阵亡期间暂停清理，信息不消失)。
  - `recordDamageLog`: **同武器伤害合并显示核心逻辑**。对同武器、同来源/目标的伤害自动在已有条目上实时累加伤害量（amount）并更新时间戳，而不是每次命中新增一行。
  - `damageEnemy` / `damagePlayer` / `damagePlayerEntity`: 自动捕获玩家伤害输出（`damageDealt`）、承伤（`damageTaken`）与死亡（`deaths`）。
* **实机精美武器模型 UI 绘制 (`drawWeaponModel`)** (`src/game/draw.ts`, `lines ~2545 - 2560`)：
  - `drawWeaponModel`: 将选装备页面（LoadoutScreen）与 HUD/伤害日志中的武器图标统一替换为游戏内真实的精细武器建模。
* **结算 MVP 与玩家统计导出 (`postGameStats` / `emit`)** (`lines ~88 - 165` 与 `lines ~7825 - 7860`)：在 `HudState` 中新增 `postGameStats` 数组，结算时自动计算最高得分者为 MVP 并排序导出。
* **服务端权威 Tick 与世界推进 (`simulateWorld` / `stepServer`)** (`lines ~5364 - 5420`)：30Hz 推进逻辑与基地/死斗胜负判定。
* **网络快照与状态同步 (`getSnapshot` / `applySnapshot`)** (`lines ~5210 - 5280` 与 `lines ~5560 - 5640`)：生成与应用 Snapshot。注意 `applySnapshot` 必须正常无报错运行，才能使 `this.peerReady = true`，解除“等待对手同步”蒙层。
* **Canvas 渲染与绘图 (`draw` / `drawBackground`)** (`lines ~6560 - 6700`)：处理场景背景、基地光圈渲染（生化/死斗跳过基地绘制）。

### 权威 WebSocket 服务端 (`server/authoritative.mjs`)
* **静态 HTTP 与 API 服务** (`lines ~40 - 98`)：包含静态资源响应与 `/api/online` 在线人数接口。
* **房间匹配与队列 (`find` / `create` / `join`)** (`lines ~100 - 235`)：负责把等待玩家两两匹配并分配固定 pid (1 与 2)。
* **`hello` 数据包处理与引擎启动 (`startEngine`)** (`lines ~240 - 255`)：当双方 Loadout 都到达后唤醒 Node 端的 `GameEngine` 线程。
* **30Hz 循环步进器 (`startTick`)** (`lines ~140 - 180`)：高精度累加器触发 `stepServer` 并广播快照。

### UI 界面与交互 (`src/components/*` & `src/index.css`)
* **Canvas 游戏循环挂载** (`src/components/GameScreen.tsx`, `lines ~170 - 240`)：创建 `GameEngine` 实例并绑定 `requestAnimationFrame`。
* **“等待双方同步”蒙层 (`hud.connecting`)** (`src/components/GameScreen.tsx`, `lines ~608 - 622`)：当 `this.peerReady` 为 false 时弹出的加载动画。
* **复活倒计时条与右侧伤害统计版 (The Finals 风格)** (`src/components/GameScreen.tsx`, `lines ~844 - 910`)：
  - 阵亡状态下正下方渲染 `后可以重生 X S` 倒计时条 (6s)。
  - 顶部标题横条为红色斜体高亮：`被淘汰 / [击杀者名称]` (`eliminatedBy`)。
  - **时间顺序**：按时间从上到下由近到远排列（最上条为致死伤害/最新事件，最下条为较早事件）。
  - **元素布局**：`[致死💀图标/伤害数值 (247)] -> [精美实机武器模型图标] -> [由/对] -> [对手ID/名称]`。
  - **2秒固定序列渐进展开动画**：在 CSS 中设定 `opacity: 0` 与 `animation-fill-mode: both`，消除一开始直接打出的问题；列表整体展开时间固定为 `2.0s`，无论数据多少条，都在 2 秒内优雅渐进滑入展示。
* **游戏内 HUD 武器栏与击杀播报 (The Finals 风格)** (`src/components/GameScreen.tsx`, `lines ~740 - 750` & `lines ~1000 - 1012`)：
  - 右下方主/副武器切换栏（按 E 切换）与右上角实时击杀播报栏中的武器图标已全量同步替换为游戏实机精细武器建模（`drawWeaponModel`），包含枪管、握把、渐变涂装及发光特效。
* **全屏结算总结界面 (The Finals 风格)** (`src/components/GameSummaryScreen.tsx`, 全文件 `lines 1 - 150` & `src/components/GameScreen.tsx`, `lines ~834 - 842`)：
  - 游戏结束时替代原微型弹窗，全屏卡片式展示各参赛者得分、击杀、死亡、造成伤害与承受伤害。
  - 第一名/最高得分者高亮 MVP 黄金标示（`★ MVP 杰出选手`），并搭配 `animate-card-pop` 弹入动画。

---


## 6. 武器与道具建模 / 特效模式（务必分清两套绘制）

游戏里每把武器有**两套完全独立的绘制入口**，改一处不影响另一处，别搞混：

* **世界建模 `drawWeapon`（`src/game/draw.ts`，~700 行区间）**：角色手上握着的武器在游戏世界里的样子（会跟随玩家 `translate/rotate`）。每把枪一个 `case`。
* **UI 图标 `drawWeaponIcon`（`src/game/draw.ts`，~2200 行区间，紧接 `case "lightning_whip":`）**：选装备界面 / HUD 里的小图标。**同样每把枪一个 `case`**。

> [!CAUTION]
> **血泪教训——武器图标变成一个圆**：
> 若 `drawWeaponIcon` 里**缺了某把武器的 `case`**，会 fall through 到 `default` 分支，`default` 画的是一个圆。
> 曾经 `dual_blades`（双刀）与 `thrust_sword`（长剑）在世界建模 `drawWeapon` 里明明有独立造型，但图标却是圆——就是因为 `drawWeaponIcon` 漏写了对应 `case`。
> **结论：新增或改武器时，`drawWeapon` 和 `drawWeaponIcon` 两处 `case` 都要补齐，否则图标默认变圆。**

### 图标绘制辅助函数模式
`drawWeaponIcon` 内提供两个闭包辅助函数，统一造型风格，请沿用：
* `body(() => { ...path... })`：绘制武器主体（填充+描边+发光）。
* `cutout(() => { ...path... })`：在主体上"抠"出握把、缠绕线等细节（挖空/叠加描边）。
坐标系以图标中心 `(0,0)` 为原点，尺寸大约在 ±8 像素内。参考已实现的 `dual_blades`（交叉 X 形双刃 + 圆握把）、`thrust_sword`（斜向长剑刃 + 护手 `rect` + 握把缠绕线）。

### 屏幕范围/技能指示器模式（如长剑冲刺）
需要在屏幕上给玩家显示技能范围（冲刺走廊、攻击范围）时，在 `engine.ts` **本地玩家渲染块**（`if (p === this.player)` 内、`drawCharacter` 之前，~8969 行）绘制：
1. `ctx.save()` → `translate(p.x, p.y)` → `rotate(p.angle)` 进入玩家局部坐标系。
2. 用 `this.gun.chargeDashDist` / `chargeDashRange` 等武器数据画走廊矩形 + 虚线轮廓（`setLineDash`）。
3. 用 `0.5 + 0.5*Math.sin(this.time*12)` 做呼吸/脉冲透明度动画。
4. 终点画命中圆（`arc`）+ 箭头（三角）指示方向，最后 `ctx.restore()`。
只在本地玩家渲染块画，避免污染其他玩家/服务端。

## 7. 计分系统陷阱：小数伤害每帧舍入丢分

> [!WARNING]
> **血泪教训——击中计分与实际伤害不符**：
> 原逻辑在 `damagePlayerEntity` 里对每帧伤害做 `Math.round(hpDiff)` 后加分。对于**连续/DoT/高频低伤武器**（燃烧、鞭子、快速多段），单帧伤害往往是小于 0.5 的小数，`Math.round` 直接归零，**这些伤害永远拿不到分**，导致总分远低于实际造成的伤害。

**正确做法——浮点累加器 `awardDamageScore`**：
* `Player` 接口加 `scoreAcc?: number;`；engine 类加 `private localScoreAcc = 0;`。
* 每次造成伤害调用 `this.awardDamageScore(attackerId, dealt)`：把浮点伤害累加进 `scoreAcc`，累计 `>= 1` 时才 `Math.floor` 取整加进 `score`，余数留到下一次。这样小数伤害不会丢失。
* PvE（`damageEnemy`）也要按**实际伤害**（`before - Math.max(hp,0)`，截断 overkill）累计给分，别只在击杀时给分。
* `biohazard`（生化）模式不计伤害分，函数开头直接 return。

**通用原则：任何"按累计量给整数奖励"的地方，都要用浮点累加器 + 取整留余，绝不能每帧 `Math.round`/`Math.floor` 后相加。**

## 8. HUD 操作提示（`src/components/GameScreen.tsx`）
* 键位说明集中在常量 `HUD_HINTS`（数组）。**新增键位绑定时记得同步更新这里**，否则玩家看不到。
* 提示 UI：右上角 `?` 按钮 / 按 `H` 键切换完整操作面板（覆盖层 `z-[60]` 双列网格）；开局自动淡出的提示条（约 8 秒）。
* 实际键位以 `engine.ts` 的按键处理为准（WASD/方向、鼠标左右键、Q/空格、E、R、1/2/3、滚轮、F、长按 V、P/Esc），改说明前先去 `engine.ts` 核对真实绑定，别照抄旧文档。

---

## 9. 特殊武器/道具"特别效果"实现位置速查

> [!IMPORTANT]
> **一条铁律先记住**：`draw.ts` 只画**武器造型/图标**；所有**战斗特效**（爆炸、火焰场、毒云、鞭击、挥砍、冲刺轨迹等运行时视觉）都在 **`engine.ts` 的 `drawEffects()`（~9213 行）** 和主渲染循环（~8467 行的场地字段渲染），**不在 `draw.ts`**。找特效逻辑别去 draw.ts 白费功夫。
> 行号为大致定位，代码改动后会漂移，请以函数名为准搜索。

### 9.1 武器特殊字段（`data/guns.json`）
| 字段 | 武器 | 含义 |
|---|---|---|
| `chargeMin`/`chargeDashDamage`/`chargeDashDist`/`chargeDashRange` | thrust_sword | 突刺长剑：最小蓄力秒/冲刺伤害/冲刺距离px/命中半径 |
| `whip:true` + `slowOnHit` | lightning_whip | 鞭子标记 + 命中减速时长 |
| `comboLength`/`comboDamage` | dual_blades、spear | 连段数 / 各段伤害数组 |
| `reflectRange`/`reflectSelfDamage` | dual_blades | 右键举刀反弹子弹半径 / 反弹自身承伤比 |
| `meleeRange`/`meleeArc` | 所有近战 | 挥砍半径 / 弧度 |
| `flameCone`/`flameRange`/`heatPerShot`/`coolRate` | flamethrower、poison_mist | 锥角/射程/过热增量/冷却 |
| `slamDamage`/`explosionRadius` | hammer | 右键砸地伤害/半径 |
| `explosive:true`/`explosionRadius`/`bounces` | mortar、rocket、mgl32、grenade | 爆炸标记/半径/反弹次数 |
| `burst`/`burstSpread`/`wallPierceChance` | plasma_rifle | 三连发/散布/穿墙概率 |
| `parallel`/`parallelGap`/`drift` | shak50 | 并排弹丸数/间距/扩散 |
| `pierce` | sniper、drone、fcar 等 | 穿透目标数（99≈高穿透） |
| `maxChargeTime`/`minChargeMult`/`maxChargeMult`/`drawSlowMult` | recurve_bow | 蓄力乘数与拉弓减速 |
| `spinup`/`spinDown`/`spinMinMult` | gatling | 预热/降温曲线 |
| `beamRange` | pulse | 激光束射程 |
| `shieldHp`/`shieldArc`/`shieldDuration`/`shieldRechargeTime` | riot_shield | 防爆盾数值 |

> 特效调色板：`engine.ts` ~11-16 行（whip/fire/poison/explosive/pierce 五套色）；武器分类 `getGunKind` ~20-29 行。

### 9.2 特效运行逻辑（`engine.ts` 函数名 + 大致行号）
* **突刺冲刺（thrust_sword）**：`thrustRelease()` ~3205（抬右键触发，读 chargeDash* 参数推 `slash` 特效）；`stepThrustDash(dt)` ~3243（每帧推进位移 + 沿走廊结算伤害）；开始蓄力 `onMouseDown` ~2269。**屏幕范围指示器**见第 6 章（本地玩家渲染块 ~8969）。
* **火焰 DoT（flamethrower / fire 场地）**：`updateFlamethrower()` ~3407（锥形灼烧，给 `burnT`/`burnDps`，推 `flamecone`）；场地伤害结算 ~4796-4832（每 0.25s）；`burnT` 衰减 ~4594。
* **毒气 DoT（poison_mist / 毒云）**：`updatePoisonMist()` ~3493（喷毒雾推 `poisoncloud`）；`applyPoison()` ~4874（停留越久 DPS 越高）；场地结算同 ~4796-4832。
* **闪电鞭（lightning_whip）**：`fireMelee()` ~3042-3136（`whipToggle` 左右交替挥、推 `whip` 特效、命中设 `slowT = slowOnHit`）。
* **双刀多段（dual_blades）**：右键举刀反弹 `onMouseDown` ~2258（设 `bladeRaising`/`bladeReflectRange`）；连段伤害在 `fireMelee()`（用 comboLength/comboDamage）。
* **部署物（炮塔/地雷）**：`updateDeployables()` ~4324；炮塔锁定开火 ~4330-4383；地雷触发爆炸 ~4447，毒/火地雷推 `poisoncloud`/`firefield` ~4475-4490。
* **爆炸（手雷/火箭/榴弹）**：`explode()` ~6890（推 `explosion`+`shock`，空间网格范围伤害，对部署物溅射）；`updateBullets()` ~3816 各 explosive 分支调用；`updateGrenades()` ~4067（落地生成 firefield/poisoncloud 或爆炸）。
* **减速对移动的影响**：`updatePlayer` ~2405/2495/2677/2717（`slowT` 时移速 ×0.5）。
* **主循环调用顺序**：~6233-6239 `updateBullets → updateGrenades → updateDeployables → … → updateEffects`。

### 9.3 特效渲染位置（`engine.ts`，非 draw.ts）
* **`drawEffects()`** ~9213：`explosion`(9218)/`shock`(9228)/`spawn`(9235)/`debris`(9241)/`coinburst`(9247)/`slash`(9294)/`saberswing`(9312)/`whip`(9349)/`slam`(9373)/`flamecone`(9388)/`glue`(9399)/`skillcast`(9405)。
* **场地云渲染**（主循环）：`poisoncloud` ~8467-8494（浮动气泡）、`firefield` ~8495（火焰渐变）。
* **`drawFlameCone()`**（引擎私有）~8863（锥形火焰视觉）。
* 鞭击击杀特效：`spawnCoinBurstFX` ~4930（`style:"whip"`）。

### 9.4 武器造型/图标（`draw.ts`，仅静态外形）
* 造型 `drawWeapon()`（~45 起 case 分支）：rocket ~209、lightning_whip ~507（闪烁能量尾）、poison_mist ~660、dual_blades ~722（交叉 X 双刃）、thrust_sword ~763、通用近战刀身 ~314、mgl32 ~406。
* 武器图标 `drawWeaponIcon()`（~1421 起）：rocket ~1713、poison_mist ~2147、lightning_whip ~2212、dual_blades ~2238、thrust_sword ~2261。
* 道具/部署物图标 `drawGadgetIcon()`（~2298 起）：turret_mg ~2339、turret_cannon ~2371、mine_explosive ~2398、mine_poison ~2418、mine_fire ~2463、glue_grenade ~2494、fire_grenade ~2525、poison_grenade ~2590。

---

## 10. 构建/部署陷阱：首屏黑屏、加载慢、以及"卡在加载界面"三大坑（vite-plugin-singlefile）

> [!CAUTION]
> ：首屏加载慢/黑屏容易修，但最容易踩的隐藏大坑是——**改完构建后整个应用卡在加载界面进不去**。下面三条都来自真实线上事故。

### 10.1 坑一：大资源内联 → 首屏慢 / 黑屏
* **症状**：首次加载有概率（约 30%）黑屏，且首屏加载时间长。
* **根因**：`vite-plugin-singlefile` 默认 `useRecommendedBuildConfig:true` → 强制 `assetsInlineLimit=()=>true`，把 `home-bg.png`（**5.55 MB**）base64 内联进 `dist/index.html`，首屏 HTML 变成 6MB+。加上 `#root` 初始为空、`body` 背景深色 `#0b0c22`（`src/index.css`），JS 未挂载完时露出深色 body = 像黑屏。
* **正确修复（落地 v0.4.34）**：把大图从 `src/assets` **移到 `public/`**，在 `App.tsx` 用**字面量字符串** `const homeBg = "home-bg.png"` 引用（不要 `import homeBg from "./assets/..."`）。这样图作为独立文件 `dist/home-bg.png` 输出（不内联），HTML 只内联 JS+CSS（~0.6MB）。`index.html` 的 `#root` 内保留首屏 splash（品牌+spinner），JS 挂载后由 React 自动替换。

### 10.2 坑二（最致命）：`import.meta` 在经典脚本里 = 整个应用卡死
* **症状（v0.4.33 真实事故）**：网页端**卡在加载界面（"加载中…"）进不去**，看似没进度但其实是 React 根本没挂载。
* **根因链（必须理解）**：
  1. 构建脚本 `scripts/fix-file-protocol.mjs` 会扫描产物，把内联脚本的 `<script type="module">` **降级成经典 `<script>`**（目的是让 `file://` 双击直接打开也能跑，模块脚本在 file:// 下会被 CORS 拦）。
  2. `v0.4.33` 给 `vite.config.ts` 加了 `base:"./"`，且 `App.tsx` 用 `import homeBg from "./assets/home-bg.png"`。Vite 对 `import` 进来的资源在 `base:"./"` 下用 `new URL("home-bg-*.png", import.meta.url)` 生成路径 → 内联 bundle 里出现了 **`import.meta`**（模块专用语法）。
  3. **经典 `<script>` 里写 `import.meta` 直接抛 `SyntaxError`** → 整段脚本不执行 → React 永不挂载 → splash 永远卡着。
* **铁律（牢记）**：**绝不要在 file://-safe 的 singlefile 构建里用 `base:"./"` + `import` 资源**（会产生 `import.meta`）。需要大资源 → 放 `public/` + 字面量字符串引用（见 10.1）。验证脚本：`grep` 产物确认无 `import.meta`、无 top-level `import/export`、无动态 `import()`，且脚本标签是普通 `<script>` 位于 `</body>` 前。
* **`vite.config.ts` 保持默认即可**：`plugins:[react(), tailwindcss(), viteSingleFile()]`，**不要**加 `base`、`assetsInlineLimit`、`inlineDynamicImports`、`useRecommendedBuildConfig:false` 这些花活——它们只会引入 10.2 的致命回归。

### 10.3 坑三：动态导入 + singlefile 在 file:// 下失效
* `App.tsx` 里用 `React.lazy(()=>import("./components/GameScreen"))` 做代码分割，在 singlefile 构建 + file:// 双击场景下，动态 chunk 会被 CORS 拦截导致进不了游戏。v0.4.34 已改回**静态 `import GameScreen`**（重型引擎 JS ~0.5MB，首屏解析很快，没必要懒加载）。

### 10.4 配套确认
* `server/prod.mjs` 与 `server/authoritative.mjs` 的 `STATIC_TYPES` 已含 `.png/.css/.js` 等 MIME，独立背景图/音频能被正确以 `image/png`、`audio/wav` 提供（否则变 `octet-stream` 不显示/不播放）。音频 wav 在 `public/`，交互时才 `new Audio()` 加载，不阻塞首屏。
* `dist/` 被 `.gitignore` 忽略；部署时由服务器重新 `npm run build` 生成。`server/engine.bundle.mjs` 是 `build:engine`（esbuild 打包 `src/game/engine.ts`）产物，会随仓库提交，prod server 跑的是它。
* **禁忌**：不要再把大资源塞回内联；不要给 singlefile 构建加 `base:"./"` 或动态导入。

