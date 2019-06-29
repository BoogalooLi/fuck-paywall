# 干掉付费墙
这个库是一些扩展的集合。
## bypass-paywalls
这个插件十分有用，对绝大多数常见英文媒体都有效。（华尔街日报抽风时可以用下面的油猴脚本，经济学人只需要把javascript禁用就行了）  
这是原本的repo链接 https://github.com/iamadamdev/bypass-paywalls-chrome  
我也fork了一下，https://github.com/sherpahu/bypass-paywalls-chrome  
防止被删，也建议各位fork一下。  
这里也上传了一份，侵删。  

## 媒体付费墙杀手
这个插件原理很简单，针对不同强度的付费墙，分别进行不同的网页设置。  
如禁用cookies（对于Bloomberg等限制免费浏览次数的网站有效），禁用javascript（对于economist这种在正文加载完毕后弹出付费墙的网站有效）。  
但效果一般。  
谷歌应用商店已经下架，在一些国内的插件下载网站能够搜索到，但是好像下载失败。  

## The Wall Street Journal Full Text Articles  
油猴插件，用来破解华尔街日报的付费墙。目前已经在Greasymonkey上下架了，特此上传备份。  
bypass-paywalls有时候抽风（华尔街日报可能会禁掉Facebook、Twitter的阅读免费接口），但是这个插件是利用手机版(url中添加/amp)获得文本内容，很稳！
优点：稳。  
缺点：没有评论区，看不到白左和红脖子撕逼。  

## 补充：  
由于经济学人十分有学究气，用词较难，所以查词插件是十分必要的。前文所述的方法是完全禁用javascript，这样虽然可以屏蔽经济学人的付费墙，但是由于查词插件也是依靠javascript加载的，所以全部屏蔽javascript会导致查词插件无法使用。  
经探索，经济学人在加载的过程中是先把文章全部加载出来，再利用tinypass.com这个网站来检测是否付费。因此，可以通过屏蔽tinypass.com实现屏蔽付费墙的功能。   
可以在广告屏蔽插件中加入tinypass.com，将其屏蔽。  
我使用的是ABP，依次点击设置->高级->我的过滤列表->编辑过滤列表，添加tinypass.com即可。  




所有插件仅供中国大陆地区公民个人学习使用，切勿商用！  
