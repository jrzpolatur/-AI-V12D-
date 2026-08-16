# Original User Request

## 2026-08-16T08:11:29Z

全面将 Project2.0 的 16-Bit Arcade 像素美术风格、动态光影与场景渲染系统复刻移植至本项目（2D 射击游戏）。

Working directory: c:\Users\86139\Documents\2d-shooter-for-claudeorgemini
Integrity mode: development

## Requirements

### R1. Arcade 像素角色与动画系统
复刻 Project2.0 风格的 2.5D / Arcade 像素角色渲染管线。包含模块化头盔、发光目镜 (Visor)、多层披风/战袍阴影分层、躯干护甲与腿部步态动画 (Walk bobbing)，并支持受击全白闪烁 (Hurt Flash)、虚线护盾光环、重生成金色保护环与隐身折射透明度。

### R2. 动态环境光影与暗夜提灯系统 (Dynamic Lighting & Ambient Lantern)
复刻基于 Canvas 遮罩与 `destination-out` 混合模式的动态光照层（GameRenderer）。实现不同地图主题的环境色调暗度（暗夜深蓝/冰原白昼/西部黄昏/生化墨绿），包含玩家提灯视野光环、子弹飞行发光晕影、爆炸震荡波与酸液池高光。

### R3. 多主题像素地块与建筑道具系统 (5-Themed World & Pixel Props)
复刻并适配 5 种主题环境地块与像素建筑道具：大厅基地（传送门、军械库全息台、轨道标靶）、冰原前哨、狂野西部、废弃未来都市及生化废墟地牢，确保砖石、道路、沙地与装饰物具备鲜明的像素层次感与碰撞体积。

### R4. 像素武器与战斗粒子特效 (Pixel Weapons & FX)
复刻枪械、近战武器（双刀招架光效、刺剑突刺充能导轨、重锤震地裂纹、防暴盾火花）与投掷物的像素化造型；同步集成 CRT 扫描线滤镜、像素复古字体样式与屏幕边缘敌方预警雷达箭头。

## Acceptance Criteria

### 编译与运行稳定性
- [ ] TypeScript 编译 (`npm run build` 或 `npx tsc`) 零报错，Vite 开发环境无语法与模块加载异常
- [ ] 游戏 Canvas 主循环稳定 60 FPS 运行，各帧渲染与光照计算无性能卡顿或内存泄漏

### 美术与渲染表现
- [ ] 角色呈现清晰的 Arcade 像素立绘，移动时具备明显的步态起伏与阴影，武器贴合手部朝向与开火动画
- [ ] 动态光影层生效，能够根据地图主题呈现差异化暗度，玩家提灯与弹道光晕平滑自然
- [ ] 地图地块与像素道具视觉风格统一，无模糊或拉伸失真，CRT 扫描线与像素字体正常渲染
- [ ] 现有单人模式与多人联机对局功能完好无损，物理碰撞与伤害判定不受美术重构影响
