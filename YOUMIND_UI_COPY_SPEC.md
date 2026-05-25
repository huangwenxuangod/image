# YouMind 视觉与 UI 复刻规范

## 1. 目标

这份文档的目标不是“参考 YouMind 做一个类似风格”，而是：

- 直接复刻 YouMind 的公开视觉语言
- 直接复刻 YouMind 的网页 UI 组织逻辑
- 把复刻结果压成可实现的组件规格

适用范围：

- 你的 AI 生图站 Web 版
- React + TypeScript + HeroUI
- 首发页面：`Create / Projects / Favorites / Settings`

注意：

- 下面的“设计逻辑”和“结构关系”来自 YouMind 当前公开官网、Overview、Use Cases、Prompts、Pricing、Updates 页面能稳定观察到的模式
- 下面的像素级数值，是基于这些页面的布局比例反推出来的复刻规格，用于实现时直接落地
- 目标不是法律意义上的像素级拷贝，而是最大程度复刻其信息结构、视觉节奏、控件气质与页面秩序

## 2. 复刻原则

如果只抄 YouMind，就遵守这 5 条，不要改：

1. 页面气质是“创作工作台”，不是“工具后台”
2. 页面用大量浅色留白和轻容器，不靠重边框和重阴影做层级
3. 组件统一走中等偏大的圆角体系
4. 内容排版比装饰更重要，图片和文字内容本身是主角
5. 所有动作按钮都做得轻，不做强营销感和强 CTA 感

## 3. 从公开页面能确认的 YouMind 设计信号

基于 [首页](https://youmind.com/)、[Overview](https://youmind.com/overview)、[Use cases](https://youmind.com/use-cases)、[Prompts](https://youmind.com/prompts)、[Pricing](https://youmind.com/pricing)、[Updates](https://youmind.com/updates/officially-introducing-ai-write-and-new-board) 可以确认：

- 顶层导航极简，主要栏目不多：`Overview / Use cases / Skills / Prompts / Pricing / Blog / Updates`
- 首屏不是复杂操作面板，而是简单标题、说明、主按钮
- 栏目块之间依靠留白断开，而不是强分隔线
- 大多数内容容器都有柔和圆角
- 页面语气偏产品编辑部，不是赛博工具风
- 页面视觉重点永远是内容块和案例块，不是 UI 炫技
- 公开页非常克制，没有高饱和品牌色大面积铺底
- “Board / Project / Prompt Pack / Use Case” 这类容器是其信息组织核心

这意味着复刻时必须优先抄：

- 导航的克制感
- 轻量容器层级
- 大留白
- 中性浅背景
- 卡片式信息组织

## 4. 整体页面框架

你的生图站如果按 YouMind 复刻，不要做传统顶部导航首页，而要直接做工作台结构。

建议总布局：

- 左侧固定窄边栏
- 中间内容主区
- 底部固定创作输入区
- 右侧详情抽屉

对应页面骨架：

1. `App Shell`
2. `Left Sidebar`
3. `Main Workspace`
4. `Bottom Composer`
5. `Right Drawer`

## 5. 画布与背景

### 5.1 页面背景

直接复刻 YouMind 的感受，背景要做成暖白偏米灰，不要纯白。

建议值：

- 页面主背景：`#F7F4EE`
- 二级背景：`#F2EEE7`
- 页面最深文字：`#20242A`
- 次级文字：`#6B7280`
- 描边：`rgba(28, 32, 36, 0.08)`
- 强描边：`rgba(28, 32, 36, 0.14)`

### 5.2 背景使用规则

- 大背景只用纯色或极轻渐变
- 不使用明显纹理
- 不使用厚重拟物阴影
- 不使用高对比深浅拼接

## 6. 间距系统

直接统一，不要自由发挥。

### 6.1 基础间距刻度

- `4`
- `8`
- `12`
- `16`
- `20`
- `24`
- `32`
- `40`
- `48`

实现上只允许这些间距值。

### 6.2 页面级边距

- 页面左右安全边距：`24px`
- 页面顶部边距：`20px`
- 页面底部边距：`24px`
- 侧边栏与主区间距：`20px`
- 主区顶部标题与内容区间距：`16px`

### 6.3 模块间距

- 一级模块之间：`24px`
- 二级模块之间：`16px`
- 卡片内部内容块之间：`12px`
- 图标与文字：`8px`
- 小标签之间：`6px`

## 7. 圆角系统

YouMind 的核心气质之一就是“柔和但不幼态”的圆角。

直接固定为：

- `8px`：标签、微按钮
- `12px`：图标按钮、次级小控件
- `14px`：常规按钮、输入组件
- `16px`：普通卡片
- `20px`：大卡片 / 面板
- `24px`：底部 Composer / Drawer / 主面板

组件映射：

- Sidebar icon button：`14px`
- Secondary button：`14px`
- Primary button：`14px`
- Input / Select / Segmented：`14px`
- Image card：`18px`
- Standard panel：`20px`
- Bottom composer：`24px`
- Drawer：`24px`

## 8. 阴影与边框

YouMind 的公开视觉不是重阴影体系，重点是浅色描边和低反差层级。

### 8.1 边框

- 默认边框：`1px solid rgba(28, 32, 36, 0.08)`
- hover 边框：`1px solid rgba(28, 32, 36, 0.12)`
- focus 边框：`1px solid rgba(28, 32, 36, 0.18)`

### 8.2 阴影

- 常规卡片：`0 8px 24px rgba(26, 28, 31, 0.04)`
- hover 卡片：`0 14px 36px rgba(26, 28, 31, 0.07)`
- 浮动 composer：`0 20px 60px rgba(26, 28, 31, 0.08)`
- drawer：`0 24px 64px rgba(26, 28, 31, 0.10)`

规则：

- 默认靠边框分层
- 阴影只用于 hover 或浮层
- 不允许发光阴影

## 9. 字体与排版

### 9.1 字体

为了复刻 YouMind 公开站的干净感，建议：

- 英文：`Geist`, `Inter`, `system-ui`
- 中文：`PingFang SC`, `MiSans`, `HarmonyOS Sans SC`, `system-ui`

如果全站中英混排，中文不要单独换一套太有性格的字体，会破坏克制感。

### 9.2 字阶

- H1 页面主标题：`30px / 38px / 600`
- H2 区块标题：`22px / 30px / 600`
- H3 子标题：`16px / 24px / 600`
- 正文：`14px / 22px / 400`
- 次正文：`13px / 20px / 400`
- Caption：`12px / 18px / 500`

### 9.3 排版规则

- 页面标题与副标题之间：`8px`
- 正文宽度尽量控制在 `48-68ch`
- 不做过宽正文
- 所有辅助文本颜色都降低一级，不和标题抢层级

## 10. 左侧边栏复刻

### 10.1 尺寸

- 宽度：`84px`
- 顶部 padding：`20px`
- 底部 padding：`20px`
- 左右 padding：`12px`

### 10.2 结构

从上到下：

1. Logo 区
2. 一级导航区
3. 中部留白
4. 用户区 / 设置区

### 10.3 导航按钮

- 按钮尺寸：`44px x 44px`
- 圆角：`14px`
- 图标尺寸：`18px`
- 相邻间距：`8px`

状态：

- 默认：透明背景
- hover：浅灰白底
- active：更明显的浅底 + 轻边框

文案策略：

- 仅图标或图标为主
- 如果展示文字，只能是 tooltip，不要挤在窄栏里

## 11. 顶部标题区复刻

### 11.1 尺寸

- 区块高度：`64px`
- 标题与副标题整体不超过两行
- 下边距：`16px`

### 11.2 结构

左侧：

- 页面标题
- 项目名称或说明

右侧：

- 少量轻按钮，如 `New Project`
- 不放复杂筛选

### 11.3 按钮规范

- 高度：`40px`
- 圆角：`14px`
- 内边距：`0 14px`
- 字号：`14px`

## 12. 图片流区域复刻

YouMind 自身不是纯生图站，但它公开站和内容页体现出来的容器语言适合直接翻译成“作品流”。

### 12.1 栅格

- 桌面大屏：4 列
- 常规桌面：3 列
- 平板：2 列
- 手机：1 列

### 12.2 间距

- 列间距：`16px`
- 行间距：`16px`

### 12.3 卡片

- 圆角：`18px`
- 背景：透明或白色轻面板
- 边框：只有 hover 或选中时增强
- 图片不裁成死高度，维持原比例

### 12.4 卡片信息区

底部信息区建议这样抄：

- padding：`12px 12px 14px`
- prompt 摘要最多 2 行
- metadata 用 `12px` 或 `13px`
- 默认只展示最必要信息

## 13. 图片卡片交互规格

### 13.1 默认状态

- 只展示图
- 底部可选展示一行 prompt 摘要
- 不堆叠按钮

### 13.2 hover 状态

显示浮层按钮：

- 下载
- 收藏
- 复制 Prompt
- 再生成

按钮规格：

- 尺寸：`32px`
- 圆角：`10px`
- 背景：`rgba(255,255,255,0.82)`
- blur：可选 `8px`
- 图标尺寸：`16px`

布局：

- 右上角一组操作
- 左下或底部一组信息

### 13.3 选中状态

- 卡片边框增强
- 右侧 drawer 打开
- 卡片本身不需要高亮得太重

## 14. 底部 Prompt Composer 复刻

这是整个生图站最关键的一层。虽然 YouMind 公开页未直接暴露这个精确结构，但其“创作工作区”逻辑最适合被翻译成底部浮动 composer。

### 14.1 外层容器

- 宽度：`min(980px, calc(100vw - 168px))`
- 最小高度：`92px`
- 圆角：`24px`
- 背景：`rgba(255,255,255,0.86)`
- 边框：`1px solid rgba(28, 32, 36, 0.08)`
- 阴影：`0 20px 60px rgba(26, 28, 31, 0.08)`
- padding：`16px`

### 14.2 布局

分两行：

1. Prompt 输入区
2. 配置与提交区

### 14.3 Prompt 输入

- textarea 最小高度：`72px`
- 最大高度：`180px`
- 圆角：`18px`
- 背景：`rgba(247, 244, 238, 0.92)`
- padding：`16px 18px`
- 字号：`15px`
- 行高：`24px`
- 占满宽度

### 14.4 下方控制区

- 顶部间距：`12px`
- 左侧：模型、比例、张数 chips
- 右侧：Generate 按钮

chip：

- 高度：`32px`
- padding：`0 12px`
- 圆角：`10px`
- 字号：`13px`
- 组间距：`8px`

Generate：

- 高度：`44px`
- 最小宽度：`108px`
- 圆角：`14px`
- 内边距：`0 16px`

## 15. 按钮系统复刻

### 15.1 主按钮

- 高度：`44px`
- 圆角：`14px`
- padding：`0 16px`
- 字号：`14px`
- 字重：`600`
- 背景：深色实底或浅色高对比实底
- 阴影：极轻

因为 YouMind 公开视觉整体克制，所以主按钮不能大面积高饱和。

### 15.2 次按钮

- 高度：`40px`
- 圆角：`14px`
- padding：`0 14px`
- 背景：半透明白
- 边框：`1px solid var(--border)`

### 15.3 图标按钮

- 尺寸：`36px`
- 圆角：`12px`
- 图标：`18px`

## 16. 输入框、下拉、Segmented 复刻

### 16.1 常规输入框

- 高度：`44px`
- 圆角：`14px`
- padding：`0 14px`
- 背景：`rgba(255,255,255,0.78)`
- 边框：`1px solid rgba(28, 32, 36, 0.08)`

### 16.2 下拉选择

- 高度：`40px`
- 圆角：`14px`
- 菜单圆角：`16px`
- 菜单内边距：`8px`

### 16.3 Segmented

- 容器高度：`36px`
- 外层圆角：`12px`
- 选中项圆角：`10px`
- 内边距：`4px`

## 17. 右侧详情抽屉复刻

### 17.1 外层

- 宽度：`420px`
- padding：`20px`
- 圆角：`24px 0 0 24px`
- 背景：`rgba(255,255,255,0.94)`
- 左侧边框：`1px solid rgba(28, 32, 36, 0.08)`

### 17.2 结构

1. 顶部操作栏
2. 大图展示
3. Prompt 信息块
4. metadata 信息块
5. 操作按钮块

### 17.3 大图区

- 下边距：`16px`
- 图片圆角：`18px`

### 17.4 Prompt 区块

- 背景：`rgba(247,244,238,0.92)`
- 圆角：`16px`
- padding：`14px`
- 字号：`14px`
- 行高：`22px`

### 17.5 metadata

- 每行高度：`32px`
- 标签宽度：`88px`
- 内容自适应

## 18. Project 卡片复刻

Project 页按 YouMind 的“Board / Project” 感受来抄。

### 18.1 卡片规格

- 宽度：自适应
- 最小高度：`180px`
- 圆角：`20px`
- 背景：`rgba(255,255,255,0.8)`
- 边框：`1px solid rgba(28, 32, 36, 0.08)`
- padding：`16px`

### 18.2 内部结构

1. 顶部封面或缩略图
2. 项目标题
3. 次级说明
4. 底部统计信息

## 19. Favorites 页面复刻

Favorites 不需要独立设计语言，直接复用 Create 的图片流和卡片样式。

只多一层：

- 顶部过滤器
- 排序：最新收藏 / 最早收藏

过滤器控件：

- 高度：`36px`
- 圆角：`12px`

## 20. Settings 页面复刻

Settings 也按 YouMind 的“轻面板”做。

### 20.1 页面布局

- 主内容最大宽度：`760px`
- 每个设置 section 间距：`24px`

### 20.2 设置卡片

- 圆角：`20px`
- padding：`20px`
- 背景：`rgba(255,255,255,0.82)`
- 边框：`1px solid rgba(28, 32, 36, 0.08)`

## 21. 动效复刻

YouMind 公开视觉给人的感觉是“轻、软、平静”，所以动效只做微弱过渡。

### 21.1 时长

- 快速：`160ms`
- 常规：`220ms`
- 面板：`320ms`

### 21.2 缓动

统一使用：

```css
cubic-bezier(0.2, 0.8, 0.2, 1)
```

### 21.3 动效规则

- button hover：只变背景、边框、阴影
- card hover：上浮 `translateY(-2px)`
- drawer：右侧滑入
- overlay：透明度渐入
- focus：边框加深，不做强发光

## 22. HeroUI 落地策略

如果要“直接抄设计”，HeroUI 只能当无障碍壳子，不能用默认样式。

必须做：

- 全量覆盖 Button 样式
- 全量覆盖 Input / Textarea / Select 样式
- 全量覆盖 Card 样式
- 自定义 Drawer 和 Modal 圆角、边框、阴影
- 全局定义 spacing / radius / shadow tokens

不允许：

- 使用 HeroUI 默认主色
- 使用 HeroUI 默认按钮外观
- 使用 HeroUI 默认卡片边框和阴影

## 23. 可直接复制的页面规格

### 23.1 Create 页面

- 整页 padding：`20px 24px 140px`
- Sidebar：`84px`
- Sidebar 与主区 gap：`20px`
- 标题区高度：`64px`
- 标题区下边距：`16px`
- 图片流 gap：`16px`
- 底部 composer 距离底部：`20px`

### 23.2 Projects 页面

- 页头高度：`64px`
- 卡片栅格 gap：`16px`
- 卡片最小高度：`180px`

### 23.3 Favorites 页面

- 复用 Create 的图片流
- 页头过滤器高度：`36px`

### 23.4 Settings 页面

- 内容宽度：`760px`
- section gap：`24px`
- 单卡 padding：`20px`

## 24. 复刻优先级

如果资源有限，按这个顺序抄：

1. 背景、留白、浅容器体系
2. 统一圆角
3. Sidebar 和主区布局
4. Prompt Composer
5. 图片卡片 hover 浮层
6. Drawer
7. Project 卡片

## 25. 实施结论

如果你要“直接抄 YouMind 设计”，真正该抄的是这四件事：

- 它的页面秩序
- 它的轻容器语言
- 它的克制排版
- 它的低攻击性控件风格

你这个生图站最像 YouMind 的正确实现方式，不是做成笔记产品，而是：

- 用 YouMind 的浅色工作台语法
- 用 YouMind 的项目与卡片组织方式
- 用更适合图片资产的瀑布流
- 用底部浮动 Composer 代替传统表单页

这才是“直接抄它的设计”之后，最适合你产品目标的翻译方式。

## 26. 参考来源

- [YouMind 首页](https://youmind.com/)
- [YouMind Overview](https://youmind.com/overview)
- [YouMind Use Cases](https://youmind.com/use-cases)
- [YouMind Prompts](https://youmind.com/prompts)
- [YouMind Pricing](https://youmind.com/pricing)
- [YouMind Update: AI Write and New Board](https://youmind.com/updates/officially-introducing-ai-write-and-new-board)
- [YouMind Update: Image Creation Function](https://youmind.com/updates/v0-2-2)
