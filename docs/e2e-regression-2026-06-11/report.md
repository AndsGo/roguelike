# E2E Display Regression - 2026-06-11

Base URL: http://127.0.0.1:5173

## desktop (1280x720)

Interactions: 6
Screenshots: 10
Console errors: 0
Display/text issues: 26

### Scene Samples
- main menu: active=MainMenuScene text=13 numeric=冒险: 0  |  胜利: 0  |  英雄: 5/26  |  灵魂: 0 | v1.28.0
- difficulty dialog: active=MainMenuScene text=27 numeric=冒险: 0  |  胜利: 0  |  英雄: 5/26  |  灵魂: 0 | v1.28.0 | 适合新手的标准难度  敌人 ×1  奖励 ×1 | 更强的敌人，更好的奖励  敌人 ×1.15  奖励 ×1.2 | 需要: 1次通关 | 需要: 3次通关
- hero draft initial: active=HeroDraftScene text=58 numeric=完成5次冒险 | 通关2次 | 使用3名雷英雄通关 | 不携带治疗者通关 | 携带8个以上遗物完成一局 | 使用2名冰英雄通关
- hero draft selected: active=HeroDraftScene text=66 numeric=1 | 2 | 3 | 4 | 完成5次冒险 | 通关2次
- map initial: active=MapScene text=82 numeric=第1章: 魔法森林 | 第2章: 火山荒原 | 第3章: 深渊 | 第1章: 魔法森林 - 第1层 | 80G | 英雄:4  遗物:0  进度:0/52
- reward staged: active=RewardScene text=30 numeric=金币: +35 | 经验: +48 | 存活: 3 | 铁甲骑士 Lv.1  HP:820/820 | 疾风弓手 Lv.1  HP:450/450 | 烈焰法师 Lv.1  HP:400/400
- shop staged: active=ShopScene text=45 numeric=协同: 人类联盟(3/2)✓  精灵优雅(1/2)  战士之魂(1/2)  奥术之环(1/2)  游侠精准(1/2)  神圣祝福(1/2)  烈焰之心(1/2)  圣光共鸣(1/2) | 攻击:+10 | 30G | 防御:+8 生命:+30 | 25G | 速度:+25 攻速:+12%
- shop after buy: active=ShopScene text=45 numeric=协同: 人类联盟(3/2)✓  精灵优雅(1/2)  战士之魂(1/2)  奥术之环(1/2)  游侠精准(1/2)  神圣祝福(1/2)  烈焰之心(1/2)  圣光共鸣(1/2) | 攻击:+10 | 30G | 防御:+8 生命:+30 | 25G | 速度:+25 攻速:+12%
- rest staged: active=RestScene text=13 numeric=铁甲骑士: 820/820 HP | 疾风弓手: 450/450 HP | 烈焰法师: 400/400 HP | 圣光牧师: 500/500 HP | 休息 (恢复30%生命) | 全队恢复30%生命值
- event staged: active=EventScene text=11 numeric=80G | 购买补给（花费60金币） | 70% 风险  |  30% 风险 | 60% 有利  |  40% 风险

### Screenshots
- main menu: desktop-01-main-menu.png (1280x720, contrast 255)
- difficulty dialog: desktop-02-difficulty-dialog.png (1280x720, contrast 255)
- hero draft initial: desktop-03-hero-draft-initial.png (1280x720, contrast 254)
- hero draft selected: desktop-04-hero-draft-selected.png (1280x720, contrast 255)
- map initial: desktop-05-map-initial.png (1280x720, contrast 222)
- reward staged: desktop-06-reward-staged.png (1280x720, contrast 222)
- shop staged: desktop-07-shop-staged.png (1280x720, contrast 222)
- shop after buy: desktop-08-shop-after-buy.png (1280x720, contrast 222)
- rest staged: desktop-09-rest-staged.png (1280x720, contrast 222)
- event staged: desktop-10-event-staged.png (1280x720, contrast 222)

### Failures
- [map initial] text out of game bounds "第3章: 深渊" bounds={"x":1977,"y":56,"width":67,"height":15} game=1280x720
- [map initial] text out of game bounds "连战" bounds={"x":1349,"y":167,"width":22,"height":13} game=1280x720
- [map initial] text out of game bounds "事件" bounds={"x":1349,"y":227,"width":22,"height":13} game=1280x720
- [map initial] text out of game bounds "商店" bounds={"x":1349,"y":287,"width":22,"height":13} game=1280x720
- [map initial] text out of game bounds "休息" bounds={"x":1449,"y":167,"width":22,"height":13} game=1280x720
- [map initial] text out of game bounds "战斗" bounds={"x":1449,"y":227,"width":22,"height":13} game=1280x720
- [map initial] text out of game bounds "事件" bounds={"x":1449,"y":287,"width":22,"height":13} game=1280x720
- [map initial] text out of game bounds "首领" bounds={"x":1549,"y":231,"width":22,"height":13} game=1280x720
- [map initial] text out of game bounds "战斗" bounds={"x":1649,"y":227,"width":22,"height":13} game=1280x720
- [map initial] text out of game bounds "事件" bounds={"x":1749,"y":197,"width":22,"height":13} game=1280x720
- [map initial] text out of game bounds "战斗" bounds={"x":1749,"y":257,"width":22,"height":13} game=1280x720
- [map initial] text out of game bounds "连战" bounds={"x":1849,"y":197,"width":22,"height":13} game=1280x720
- [map initial] text out of game bounds "商店" bounds={"x":1849,"y":257,"width":22,"height":13} game=1280x720
- [map initial] text out of game bounds "精英" bounds={"x":1949,"y":169,"width":22,"height":13} game=1280x720
- [map initial] text out of game bounds "商店" bounds={"x":1949,"y":227,"width":22,"height":13} game=1280x720
- [map initial] text out of game bounds "战斗" bounds={"x":1949,"y":287,"width":22,"height":13} game=1280x720
- [map initial] text out of game bounds "战斗" bounds={"x":2049,"y":167,"width":22,"height":13} game=1280x720
- [map initial] text out of game bounds "战斗" bounds={"x":2049,"y":227,"width":22,"height":13} game=1280x720
- [map initial] text out of game bounds "战斗" bounds={"x":2049,"y":287,"width":22,"height":13} game=1280x720
- [map initial] text out of game bounds "战斗" bounds={"x":2149,"y":167,"width":22,"height":13} game=1280x720
- [map initial] text out of game bounds "事件" bounds={"x":2149,"y":227,"width":22,"height":13} game=1280x720
- [map initial] text out of game bounds "事件" bounds={"x":2149,"y":287,"width":22,"height":13} game=1280x720
- [map initial] text out of game bounds "休息" bounds={"x":2249,"y":167,"width":22,"height":13} game=1280x720
- [map initial] text out of game bounds "事件" bounds={"x":2249,"y":227,"width":22,"height":13} game=1280x720
- [map initial] text out of game bounds "商店" bounds={"x":2249,"y":287,"width":22,"height":13} game=1280x720
- [map initial] text out of game bounds "首领" bounds={"x":2349,"y":231,"width":22,"height":13} game=1280x720

## mobile-landscape (844x390)

Interactions: 6
Screenshots: 12
Console errors: 0
Display/text issues: 97

### Scene Samples
- main menu: active=MainMenuScene text=13 numeric=冒险: 0  |  胜利: 0  |  英雄: 5/26  |  灵魂: 0 | v1.28.0
- difficulty dialog: active=MainMenuScene text=27 numeric=冒险: 0  |  胜利: 0  |  英雄: 5/26  |  灵魂: 0 | v1.28.0 | 适合新手的标准难度  敌人 ×1  奖励 ×1 | 更强的敌人，更好的奖励  敌人 ×1.15  奖励 ×1.2 | 需要: 1次通关 | 需要: 3次通关
- hero draft initial: active=HeroDraftScene text=58 numeric=完成5次冒险 | 通关2次 | 使用3名雷英雄通关 | 不携带治疗者通关 | 携带8个以上遗物完成一局 | 使用2名冰英雄通关
- hero draft selected: active=HeroDraftScene text=66 numeric=1 | 2 | 3 | 4 | 完成5次冒险 | 通关2次
- map initial: active=MapScene text=85 numeric=第1章: 魔法森林 | 第2章: 火山荒原 | 第3章: 深渊 | 30G 揭示 | 第1章: 魔法森林 - 第1层 | 80G
- battle start: active=BattleScene text=69 numeric=森林祝福: 每15秒全体治疗5% | 80G | 1x | 3 | #1 | #2
- battle running: active=BattleScene text=53 numeric=森林祝福: 每15秒全体治疗5% | 80G | 1x | 3 | 治疗术 | 12%
- reward staged: active=RewardScene text=30 numeric=金币: +35 | 经验: +48 | 存活: 3 | 铁甲骑士 Lv.1  HP:820/820 | 疾风弓手 Lv.1  HP:450/450 | 烈焰法师 Lv.1  HP:400/400
- shop staged: active=ShopScene text=38 numeric=协同: 人类联盟(3/2)✓  精灵优雅(1/2)  战士之魂(1/2)  奥术之环(1/2)  游侠精准(1/2)  神圣祝福(1/2)  烈焰之心(1/2)  圣光共鸣(1/2) | 治疗者坠饰 | 增强治疗能力的神圣坠饰 | 法力:+15 生命:+40 | 48G | 法力:+22 法抗:+5
- shop after buy: active=ShopScene text=38 numeric=协同: 人类联盟(3/2)✓  精灵优雅(1/2)  战士之魂(1/2)  奥术之环(1/2)  游侠精准(1/2)  神圣祝福(1/2)  烈焰之心(1/2)  圣光共鸣(1/2) | 治疗者坠饰 | 增强治疗能力的神圣坠饰 | 法力:+15 生命:+40 | 48G | 法力:+22 法抗:+5
- rest staged: active=RestScene text=13 numeric=铁甲骑士: 820/820 HP | 疾风弓手: 450/450 HP | 烈焰法师: 400/400 HP | 圣光牧师: 500/500 HP | 休息 (恢复30%生命) | 全队恢复30%生命值
- event staged: active=EventScene text=8 numeric=134G | 花费40金币占卜 | 50% 风险  |  50% 危险

### Screenshots
- main menu: mobile-landscape-01-main-menu.png (1688x780, contrast 255)
- difficulty dialog: mobile-landscape-02-difficulty-dialog.png (1688x780, contrast 255)
- hero draft initial: mobile-landscape-03-hero-draft-initial.png (1688x780, contrast 254)
- hero draft selected: mobile-landscape-04-hero-draft-selected.png (1688x780, contrast 255)
- map initial: mobile-landscape-05-map-initial.png (1688x780, contrast 222)
- battle start: mobile-landscape-06-battle-start.png (1688x780, contrast 255)
- battle running: mobile-landscape-07-battle-running.png (1688x780, contrast 255)
- reward staged: mobile-landscape-08-reward-staged.png (1688x780, contrast 222)
- shop staged: mobile-landscape-09-shop-staged.png (1688x780, contrast 222)
- shop after buy: mobile-landscape-10-shop-after-buy.png (1688x780, contrast 222)
- rest staged: mobile-landscape-11-rest-staged.png (1688x780, contrast 222)
- event staged: mobile-landscape-12-event-staged.png (1688x780, contrast 222)

### Failures
- [map initial] text out of game bounds "第2章: 火山荒原" bounds={"x":1153,"y":54,"width":114,"height":19} game=844x390
- [map initial] text out of game bounds "第3章: 深渊" bounds={"x":1969,"y":54,"width":82,"height":19} game=844x390
- [map initial] text out of game bounds "战斗" bounds={"x":846,"y":179,"width":28,"height":17} game=844x390
- [map initial] text out of game bounds "战斗" bounds={"x":946,"y":122,"width":28,"height":17} game=844x390
- [map initial] text out of game bounds "商店" bounds={"x":946,"y":179,"width":28,"height":17} game=844x390
- [map initial] text out of game bounds "商店" bounds={"x":946,"y":237,"width":28,"height":17} game=844x390
- [map initial] text out of game bounds "事件" bounds={"x":1046,"y":149,"width":28,"height":17} game=844x390
- [map initial] text out of game bounds "战斗" bounds={"x":1046,"y":209,"width":28,"height":17} game=844x390
- [map initial] text out of game bounds "战斗" bounds={"x":1146,"y":122,"width":28,"height":17} game=844x390
- [map initial] text out of game bounds "商店" bounds={"x":1146,"y":179,"width":28,"height":17} game=844x390
- [map initial] text out of game bounds "事件" bounds={"x":1146,"y":237,"width":28,"height":17} game=844x390
- [map initial] text out of game bounds "精英" bounds={"x":1246,"y":124,"width":28,"height":17} game=844x390
- [map initial] text out of game bounds "商店" bounds={"x":1246,"y":179,"width":28,"height":17} game=844x390
- [map initial] text out of game bounds "事件" bounds={"x":1246,"y":237,"width":28,"height":17} game=844x390
- [map initial] text out of game bounds "连战" bounds={"x":1346,"y":122,"width":28,"height":17} game=844x390
- [map initial] text out of game bounds "战斗" bounds={"x":1346,"y":179,"width":28,"height":17} game=844x390
- [map initial] text out of game bounds "商店" bounds={"x":1346,"y":237,"width":28,"height":17} game=844x390
- [map initial] text out of game bounds "休息" bounds={"x":1446,"y":122,"width":28,"height":17} game=844x390
- [map initial] text out of game bounds "战斗" bounds={"x":1446,"y":179,"width":28,"height":17} game=844x390
- [map initial] text out of game bounds "商店" bounds={"x":1446,"y":237,"width":28,"height":17} game=844x390
- [map initial] text out of game bounds "首领" bounds={"x":1546,"y":183,"width":28,"height":17} game=844x390
- [map initial] text out of game bounds "战斗" bounds={"x":1646,"y":179,"width":28,"height":17} game=844x390
- [map initial] text out of game bounds "事件" bounds={"x":1746,"y":122,"width":28,"height":17} game=844x390
- [map initial] text out of game bounds "战斗" bounds={"x":1746,"y":179,"width":28,"height":17} game=844x390
- [map initial] text out of game bounds "事件" bounds={"x":1746,"y":237,"width":28,"height":17} game=844x390
- [map initial] text out of game bounds "连战" bounds={"x":1846,"y":149,"width":28,"height":17} game=844x390
- [map initial] text out of game bounds "战斗" bounds={"x":1846,"y":209,"width":28,"height":17} game=844x390
- [map initial] text out of game bounds "精英" bounds={"x":1946,"y":124,"width":28,"height":17} game=844x390
- [map initial] text out of game bounds "事件" bounds={"x":1946,"y":179,"width":28,"height":17} game=844x390
- [map initial] text out of game bounds "战斗" bounds={"x":1946,"y":237,"width":28,"height":17} game=844x390
- [map initial] text out of game bounds "战斗" bounds={"x":2046,"y":122,"width":28,"height":17} game=844x390
- [map initial] text out of game bounds "事件" bounds={"x":2046,"y":179,"width":28,"height":17} game=844x390
- [map initial] text out of game bounds "战斗" bounds={"x":2046,"y":237,"width":28,"height":17} game=844x390
- [map initial] text out of game bounds "战斗" bounds={"x":2146,"y":122,"width":28,"height":17} game=844x390
- [map initial] text out of game bounds "事件" bounds={"x":2146,"y":179,"width":28,"height":17} game=844x390
- [map initial] text out of game bounds "商店" bounds={"x":2146,"y":237,"width":28,"height":17} game=844x390
- [map initial] text out of game bounds "休息" bounds={"x":2246,"y":149,"width":28,"height":17} game=844x390
- [map initial] text out of game bounds "商店" bounds={"x":2246,"y":209,"width":28,"height":17} game=844x390
- [map initial] text out of game bounds "首领" bounds={"x":2346,"y":183,"width":28,"height":17} game=844x390
- [battle start] text out of game bounds "[威胁线]" bounds={"x":825,"y":355,"width":52,"height":17} game=844x390
- [battle start] text out of game bounds "[概览]" bounds={"x":839,"y":331,"width":38,"height":17} game=844x390
- [battle start] text out of game bounds "80G" bounds={"x":844,"y":10,"width":28,"height":18} game=844x390
- [battle start] text out of game bounds "[暂停]" bounds={"x":834,"y":26,"width":38,"height":17} game=844x390
- [battle start] text out of game bounds "铁甲骑士" bounds={"x":-65,"y":24,"width":56,"height":17} game=844x390
- [battle start] text out of game bounds "疾风弓手" bounds={"x":-65,"y":46,"width":56,"height":17} game=844x390
- [battle start] text out of game bounds "烈焰法师" bounds={"x":-65,"y":68,"width":56,"height":17} game=844x390
- [battle start] text out of game bounds "圣光牧师" bounds={"x":-65,"y":90,"width":56,"height":17} game=844x390
- [battle start] text out of game bounds "3" bounds={"x":-81,"y":122,"width":9,"height":17} game=844x390
- [battle start] text out of game bounds "[统计]" bounds={"x":839,"y":368,"width":38,"height":17} game=844x390
- [battle start] text out of game bounds "#1" bounds={"x":165,"y":390,"width":28,"height":23} game=844x390
- [battle start] text out of game bounds "盾击" bounds={"x":173,"y":399,"width":35,"height":23} game=844x390
- [battle start] text out of game bounds "铁甲" bounds={"x":174,"y":419,"width":33,"height":19} game=844x390
- [battle start] text out of game bounds "嘲讽怒" bounds={"x":224,"y":399,"width":53,"height":23} game=844x390
- [battle start] text out of game bounds "铁甲" bounds={"x":234,"y":419,"width":33,"height":19} game=844x390
- [battle start] text out of game bounds "多重射" bounds={"x":284,"y":399,"width":53,"height":23} game=844x390
- [battle start] text out of game bounds "疾风" bounds={"x":294,"y":419,"width":33,"height":19} game=844x390
- [battle start] text out of game bounds "#2" bounds={"x":345,"y":390,"width":28,"height":23} game=844x390
- [battle start] text out of game bounds "穿透箭" bounds={"x":344,"y":399,"width":53,"height":23} game=844x390
- [battle start] text out of game bounds "疾风" bounds={"x":354,"y":419,"width":33,"height":19} game=844x390
- [battle start] text out of game bounds "火球术" bounds={"x":404,"y":399,"width":53,"height":23} game=844x390
- [battle start] text out of game bounds "烈焰" bounds={"x":414,"y":419,"width":33,"height":19} game=844x390
- [battle start] text out of game bounds "#3" bounds={"x":465,"y":390,"width":28,"height":23} game=844x390
- [battle start] text out of game bounds "烈焰波" bounds={"x":464,"y":399,"width":53,"height":23} game=844x390
- [battle start] text out of game bounds "烈焰" bounds={"x":474,"y":419,"width":33,"height":19} game=844x390
- [battle start] text out of game bounds "治疗术" bounds={"x":524,"y":399,"width":53,"height":23} game=844x390
- [battle start] text out of game bounds "圣光" bounds={"x":534,"y":419,"width":33,"height":19} game=844x390
- [battle start] text out of game bounds "群体治" bounds={"x":584,"y":399,"width":53,"height":23} game=844x390
- [battle start] text out of game bounds "圣光" bounds={"x":594,"y":419,"width":33,"height":19} game=844x390
- [battle running] text out of game bounds "[威胁线]" bounds={"x":825,"y":355,"width":52,"height":17} game=844x390
- [battle running] text out of game bounds "[概览]" bounds={"x":839,"y":331,"width":38,"height":17} game=844x390
- [battle running] text out of game bounds "80G" bounds={"x":844,"y":10,"width":28,"height":18} game=844x390
- [battle running] text out of game bounds "[暂停]" bounds={"x":834,"y":26,"width":38,"height":17} game=844x390
- [battle running] text out of game bounds "铁甲骑士" bounds={"x":-65,"y":24,"width":56,"height":17} game=844x390
- [battle running] text out of game bounds "疾风弓手" bounds={"x":-65,"y":46,"width":56,"height":17} game=844x390
- [battle running] text out of game bounds "烈焰法师" bounds={"x":-65,"y":68,"width":56,"height":17} game=844x390
- [battle running] text out of game bounds "圣光牧师" bounds={"x":-65,"y":90,"width":56,"height":17} game=844x390
- [battle running] text out of game bounds "!" bounds={"x":880,"y":90,"width":5,"height":16} game=844x390
- [battle running] text out of game bounds "3" bounds={"x":-81,"y":122,"width":9,"height":17} game=844x390
- [battle running] text out of game bounds "[统计]" bounds={"x":839,"y":368,"width":38,"height":17} game=844x390
- [battle running] text out of game bounds "盾击" bounds={"x":173,"y":399,"width":35,"height":23} game=844x390
- [battle running] text out of game bounds "铁甲" bounds={"x":174,"y":419,"width":33,"height":19} game=844x390
- [battle running] text out of game bounds "嘲讽怒" bounds={"x":224,"y":399,"width":53,"height":23} game=844x390
- [battle running] text out of game bounds "铁甲" bounds={"x":234,"y":419,"width":33,"height":19} game=844x390
- [battle running] text out of game bounds "多重射" bounds={"x":284,"y":399,"width":53,"height":23} game=844x390
- [battle running] text out of game bounds "疾风" bounds={"x":294,"y":419,"width":33,"height":19} game=844x390
- [battle running] text out of game bounds "穿透箭" bounds={"x":344,"y":399,"width":53,"height":23} game=844x390
- [battle running] text out of game bounds "疾风" bounds={"x":354,"y":419,"width":33,"height":19} game=844x390
- [battle running] text out of game bounds "火球术" bounds={"x":404,"y":399,"width":53,"height":23} game=844x390
- [battle running] text out of game bounds "烈焰" bounds={"x":414,"y":419,"width":33,"height":19} game=844x390
- [battle running] text out of game bounds "烈焰波" bounds={"x":464,"y":399,"width":53,"height":23} game=844x390
- [battle running] text out of game bounds "烈焰" bounds={"x":474,"y":419,"width":33,"height":19} game=844x390
- [battle running] text out of game bounds "治疗术" bounds={"x":524,"y":399,"width":53,"height":23} game=844x390
- [battle running] text out of game bounds "圣光" bounds={"x":534,"y":419,"width":33,"height":19} game=844x390
- [battle running] text out of game bounds "群体治" bounds={"x":584,"y":399,"width":53,"height":23} game=844x390
- [battle running] text out of game bounds "圣光" bounds={"x":594,"y":419,"width":33,"height":19} game=844x390
- [shop staged] text out of game bounds "协同: 人类联盟(3/2)✓  精灵优雅(1/2)  战士之魂(1/2)  奥术之环(1/2)  游侠精准(1/2)  神圣祝福(1/2)  烈焰之心(1/2)" bounds={"x":-13,"y":90,"width":806,"height":17} game=844x390
- [shop after buy] text out of game bounds "协同: 人类联盟(3/2)✓  精灵优雅(1/2)  战士之魂(1/2)  奥术之环(1/2)  游侠精准(1/2)  神圣祝福(1/2)  烈焰之心(1/2)" bounds={"x":-13,"y":90,"width":806,"height":17} game=844x390

