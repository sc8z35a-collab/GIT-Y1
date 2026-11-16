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
| `materials.js` | 素材ID定義とテクスチャアトラス読み込み |
| `assets/tiles-00〜16.webp` | サイトが実際に読み込むアトラス（255×255px、1枚に85px素材×9） |
| `textures/` | 高解像度テクスチャ45種（下記） |

公開サイトの `index.html` 末尾に Cloudflare が配信時に挿入するボット判定スクリプトがありましたが、
ゲーム本体ではなく他の環境では 404 になるため除去しています。それ以外のファイルは取得したままです。

## テクスチャ (`textures/`)

アトラス 08・09・10・11・13 に対応する高解像度版（1枚 1254×1254px、素材1つあたり 418×418px）。

- `textures/sheets/tiles-NN.png` … 3×3 のシート原本（5枚）
- `textures/tiles/NNN-name.png` … 個別に切り出した 45 素材。`NNN` は `materials.js` の素材ID
- `textures/index.tsv` … 素材ID・名前・シート番号・シート内位置の一覧

| シート | 素材 |
| --- | --- |
| 08 | teak, burntWood, endGrain, castIron, rope, grating, cobbles, pondPebbles, rivets |
| 09 | steppingStone, rakedGravel, wetBasalt, granite, bamboo, lattice, shingles, cushionMoss, riverGravel |
| 10 | greenSteel, brick, frosted, flutedGlass, terracotta, pottingSoil, pumice, pine, sageTile |
| 11 | limestone, roseGranite, fanPavers, rainStone, relief, bronze, limewash, darkOak, mosaic |
| 13 | aggregate, plaster, rubber, hammeredCopper, brass, blueEnamel, perforated, ceramic, oak |

サイトは現在 `assets/` の 85px 版を使っており、`textures/` の高解像度版はまだ描画に組み込まれていません。
