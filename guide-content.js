// Authored portfolio guidance. Edit these questions, answers and destinations here.
// This feature uses no model, API, network search or generated responses.
export const guideWelcome='你好呀，我是穗豪的工作台向导。帮你挑一个起点，也带你看看作品背后的想法。想先了解哪一面？';
export const guideQuestions=[
 {id:'start',question:'第一次来，先看什么？',answer:'可以先从「乐铺」开始，看看我怎样梳理商品发现、发布到交易的体验。对视觉更感兴趣，可以接着看「大润发优鲜」；喜欢角色设计，就去看看「珀利」。',actions:[{label:'从乐铺开始看',panel:'work',project:'ux'},{label:'浏览三个项目',panel:'work'}]},
 {id:'direction',question:'你主要做哪类设计？',answer:'我主要关注 UI / UX、视觉设计和 AIGC。既会梳理流程与信息层级，也会做界面、活动画面和角色设计。我的介绍和具体作品，都放在这张工作台上。',actions:[{label:'多认识一点穗豪',panel:'about'}]},
 {id:'ux',question:'乐铺项目讲了什么？',answer:'这是一个围绕闲置交易的界面与体验升级项目。我从商品发现、发布到交易的流程出发，梳理信息层级与交互，让关键操作更清晰。可以打开完整案例，继续看页面和流程的呈现。',actions:[{label:'查看乐铺完整案例',panel:'work',project:'ux'}]},
 {id:'visual',question:'有运营视觉的作品吗？',answer:'有的。「大润发优鲜」围绕活动场景、品牌 IP 与趣味玩法展开，是我对运营视觉和 AIGC 辅助设计的探索。鲜乐拍小游戏也能在工作台的手机里体验。',actions:[{label:'看看大润发优鲜',panel:'work',project:'ops'},{label:'体验鲜乐拍',panel:'game'}]},
 {id:'ip',question:'这个 IP 有什么故事？',answer:'「珀利 · 睡衣派对」从梦境守护者的角色设定出发，延展了表情、服装、场景和周边物料。打开完整案例，看看一个角色怎样变成一组有联系的视觉表达。',actions:[{label:'认识梦境守护者珀利',panel:'work',project:'ip'}]},
 {id:'life',question:'作品之外，你喜欢什么？',answer:'我喜欢手绘、摄影，也喜欢听音乐。桌上的画稿里放着我的手绘，照片墙收藏日常光影，唱片机里有音乐。那些颜色、光线和小发现，也会回到我的设计里。',actions:[{label:'翻翻我的手绘',panel:'life',source:'art'},{label:'看看日常光影',panel:'life'}]},
 {id:'contact',question:'怎么联系你聊项目？',answer:'欢迎把你的想法、项目方向，或想进一步了解的问题发给我。联系页里有邮箱；点开关于我的工牌，也能查看微信二维码。具体的内容，我们可以直接聊。',actions:[{label:'联系穗豪',panel:'contact'},{label:'看看我的工牌',panel:'about'}]}
];
