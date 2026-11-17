# 青羽公園 (Aobane Park Walk)

森と庭園、海沿いの崖を巡る3D散策。
取得元: https://aobane-park-walk.dnnsc097.chatgpt.site （2026-11-16 時点の公開版）

## 起動

ES Modules を使うため、ファイルを直接開くのではなく静的サーバー経由で開いてください。

```sh
python3 -m http.server 8000
# http://localhost:8000/ を開く（?graphics=1 で画質設定を表示）
```

## 構成

| パス | 内容 |
| --- | --- |
| `index.html`, `park.css`, `park.js` | エントリーポイント・UI |
| `renderer.js`, `software.js`, `software-shadow.js`, `hdr.js`, `graphics.js` | WebGL2 描画 / ソフトウェア描画フォールバック / WebGPU HDR 出力 / 画質設定 |
| `world.js`, `land.js`, `expansion.js`, `trees.js`, `mesh-layout.js`, `collision.js` | 地形・植生・配置・当たり判定 |
| `player.js`, `controller.js`, `avatar.js` | プレイヤー操作・アバター |
| `exploration.js` | 散策先6か所の地形・入口・設備 |
| `materials.js` | 素材ID定義とテクスチャアトラス読み込み |
| `assets/tiles-large.webp`, `assets/tiles-small.webp` | ゲームが読み込む28px・14pxタイルのアトラス |
| `assets/tiles-00〜16.webp` | 既存素材の85px版アトラス |
| `assets/fonts/title.woff2` | タイトル画面用の明朝体（しっぽり明朝 B1、使用文字のみのサブセット、ライセンスは同フォルダの `OFL.txt`） |
| `textures/` | 高解像度テクスチャ214種（下記） |

公開サイトの `index.html` 末尾に Cloudflare が配信時に挿入するボット判定スクリプトがありましたが、
ゲーム本体ではなく他の環境では 404 になるため除去しています。それ以外のファイルは取得したままです。

## 散策先

地下へは斜面を歩いて入れます。入口付近と内部では画面左下に地名を表示します。

| ロケーション | 入口の目印 | 入口の座標 (X, Z) |
| --- | --- | --- |
| 石灰岩の鍾乳洞 | 湖の西の林道から西へ入る斜面 | (-46, 5) |
| 鉱山鉄道の廃坑 | 公園西側の線路を北へ進んだ石のアーチ | (-52, -29) |
| 谷の廃採石場 | 公園北東の崖沿い遊歩道から東へ下る斜面 | (53.5, -37) |
| 旧山腹避難壕 | 湖の北の周回路から、五重塔の東で北へ分岐 | (17, -35.7) |
| 旧地下貯水槽 | 正門外の道から東へ曲がった石積みの入口 | (9, 41.5) |
| 森の神社跡 | 湖の南西の林道から南へ入った朱色の鳥居 | (-16, 33) |

## 描画用テクスチャ

既存151種類と散策先用126種類をゲームで使います。散策先用は添付アトラス11枚の99種類と、新規生成アトラス3枚の27種類です。新規生成分は洞窟の岩・方解石・川底、廃坑の鉱脈・木材・金属板、遺構のコンクリート・レンガ・設備などに使っています。

通常素材は28px、小物や葉などの細部素材は14pxです。従来の85pxを基準に辺の解像度をそれぞれ約1/3と約1/6に縮小しています。読み込むWebPは合計約60KBで、描画用タイルの画素数は従来の約14.8%です。

## 高解像度アーカイブ (`textures/`)

アトラス 08〜16 に対応する高解像度版（1枚 1254×1254px、素材1つあたり 418×418px）。
新規素材54種（ID 72〜125）と、葉・コケ・蔦・植物・雑草・作物25種（ID 126〜150）の計79種。
さらに追加135種の計画（シート17〜31、ID 153〜287）の全135種（ID 153〜287）を保存済み。
ID 153 以降は予定番号で、`materials.js` にはまだ登録されておらず、ゲームでは使われていません。

- `textures/sheets/tiles-NN.png` … 3×3 のシート原本（24枚。16番は7素材＋空き2枠）
- `textures/tiles/NNN-name.png` … 個別に切り出した 214 素材。`NNN` は `materials.js` の素材ID
- `textures/index.tsv` … 素材ID・名前・シート番号・シート内位置の一覧

| シート | 素材 |
| --- | --- |
| 08 | teak, burntWood, endGrain, castIron, rope, grating, cobbles, pondPebbles, rivets |
| 09 | steppingStone, rakedGravel, wetBasalt, granite, bamboo, lattice, shingles, cushionMoss, riverGravel |
| 10 | greenSteel, brick, frosted, flutedGlass, terracotta, pottingSoil, pumice, pine, sageTile |
| 11 | limestone, roseGranite, fanPavers, rainStone, relief, bronze, limewash, darkOak, mosaic |
| 12 | iris, whiteClover, hosta, azalea, hydrangea, redMaple, pampas, lavender, mossBark |
| 13 | aggregate, plaster, rubber, hammeredCopper, brass, blueEnamel, perforated, ceramic, oak |
| 14 | greenMaple, oakLeaf, aspen, willow, camellia, velvetMoss, starMoss, basaltMoss, barkMoss |
| 15 | ivy, creeper, wisteria, creepingFig, fern, wildStrawberry, beachGrass, plantain, mugwort |
| 16 | coastalClover, mustard, switchgrass, chard, kale, cabbage, rice |
| 17 | birchBark, sakuraBark, redPineBark, sugiBark, planeBark, crapeMyrtle, zelkovaBark, corkBark, paperbark |
| 18 | ginkgo, sakura, sakuraLeaf, blackPine, sugi, hinoki, birch, zelkova, kusunoki |
| 19 | bracketFungus, rottenWood, burlGrain, resinDrip, beetleGalleries, lightningScar, lichenBark, woodpeckerHoles, barkStripped |
| 20 | ginkgoCarpet, mapleCarpet, sakuraPetals, needleLitter, acornLitter, frost, thinSnow, puddle, wetLeaves |
| 21 | sunflower, tulip, cosmos, spiderLily, morningGlory, rose, nemophila, chrysanthemum, pansy |
| 22 | lotusLeaf, waterLily, duckweed, cattail, waterHyacinth, horsetail, waterParsley, pondAlgae, sphagnum |
| 23 | beachSand, blackSand, shellSand, barnacles, tidePool, driftwood, seaGlass, rippledSand, kelpWrack |
| 24 | oyaStone, andesite, sandstoneStrata, chalk, shale, quartzVein, obsidian, lichenRock, conglomerate |
| 25 | crackedClay, redClay, kuroboku, plowedFurrows, paddy, mushrooms, footprintMud, gravelWeeds, twigLitter |
| 26 | masado, herringbone, terrazzo, mossySteps, turfGrid, slateFlagstone, concretePavers, woodBlockPavers, crackedAsphalt |
| 27 | kawara, thatch, shoji, namakoWall, earthenWall, vermilion, hiwadabuki, takegaki, yoshizu |
| 28 | gabion, rammedEarth, cinderBlock, siding, pebbleDash, roughStucco, glazedBrick, adobe, spanishTile |
| 29 | firewoodStack, logWall, barnwood, peelingPaint, plywood, osb, rattan, mossyPlank, cork |
| 30 | checkerPlate, wiredGlass, glassBlock, stainedGlass, wroughtIron, brushedStainless, corten, treeGrate, paintedCorrugated |
| 31 | chainLink, tactilePaving, artificialTurf, runningTrack, sandboxSand, epdmChips, playgroundPaint, paintedWood, plasticSlide |

`textures/` は元画像のアーカイブです。ゲームは `assets/` の軽量アトラスを読み込みます。
