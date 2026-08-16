const fs = require('fs');
const path = require('path');

const gunsPath = path.join(__dirname, '../data/guns.json');
const guns = JSON.parse(fs.readFileSync(gunsPath, 'utf-8'));

const descMap = {
  "silenced_pistol": "半自动消音，隐蔽精准",
  "mac11": "极速连发，近身泼水",
  "mp5": "紧凑高伤，稳定连发",
  "mortar": "抛射弹道，范围爆破",
  "sniper": "超高伤害，穿透多人",
  "rocket": "巨额伤害，范围爆炸",
  "akm": "均衡稳健，全距作战",
  "fcar": "高伤重步枪，穿透点射",
  "pulse": "连续光束，过热需冷",
  "lightsaber": "近战横扫，连击收割",
  "hammer": "左键挥砍 · 右键砸地拆墙",
  "flamethrower": "扇形火海，近身灼烧",
  "sa1216": "四连重喷，近战高爆发",
  "mgl32": "反弹榴弹，范围杀伤",
  "spear": "三段突刺，位移重击",
  "drone": "离子穿墙，反弹贯敌",
  "recurve_bow": "蓄力贯穿，远程重矢",
  "riot_shield": "左键击退 · 右键举盾格挡",
  "shak50": "双发并射，近身重创",
  "r357": "单发重击，半自动精准",
  "gold_barrett": "反器材重狙，终极穿甲",
  "gatling": "预热加特林，300发倾泻",
  "poison_mist": "范围毒雾，持续蚀伤",
  "lightning_whip": "范围甩击，命中减速",
  "dual_blades": "五段连斩，右键弹反子弹",
  "thrust_sword": "轻击挥斩，蓄力高速突刺",
  "dragon_breath": "龙息烈焰，强力灼烧",
  "plasma_rifle": "三发等离子，概率穿墙",
  "lewis": "大容量弹鼓，持续压制",
  "scout": "射手步枪，半自动精准穿透",
  "m1887": "泵动重霰，贴脸高爆发",
  "throwing_knife": "极速飞刀，穿刺补刀",
  "flame_boomerang": "回旋飞刃，双程贯穿灼烧",
  "railgun": "能量重炮，超高贯穿",
  "plasma_repeater": "等离子弹，折射反弹",
  "chemical_sprayer": "剧毒激流，穿透腐蚀",
  "shuriken": "三枚散布，穿透暗器",
  "chainsaw": "高速电锯，贴身撕裂"
};

for (const gun of guns) {
  if (descMap[gun.id]) {
    gun.desc = descMap[gun.id];
  }
}

fs.writeFileSync(gunsPath, JSON.stringify(guns, null, 2), 'utf-8');
console.log('Guns desc updated successfully, total guns:', guns.length);
