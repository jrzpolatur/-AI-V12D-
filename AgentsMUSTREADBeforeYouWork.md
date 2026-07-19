# 🚨 AI Agents MUST READ Before You Work 🚨

欢迎！如果你是一个即将对这个 2D 射击游戏代码库进行开发、重构或修 Bug 的 AI Agent，**请务必在开始动手前仔细阅读本文档**。这里记录了前任 Agent 们在血与泪的调试中总结出的架构陷阱、刁钻 Bug 以及排查指南。

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

祝你好运！愿代码不出 Bug。
