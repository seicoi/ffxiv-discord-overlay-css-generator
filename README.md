# FFXIV Discord Overlay CSS Generator

静的サイトです。`index.html` を開くか、このフォルダーをそのまま GitHub Pages の公開対象に置いてください。ビルドやサーバーは不要です。

## OBSでの使い方

1. Discordの開発者モードを有効にし、固定メンバー8人のユーザーIDを取得します。
2. サイトでMTからD4までのIDを入力します。名前欄はプレビュー専用です。
3. StreamKitの **Voice Widget** URLをOBSのブラウザソースに設定します。`hide_names=false` と `limit_speaking=false` にしてください。
4. 「CSSをコピー」で得た内容を、そのブラウザソースの「カスタムCSS」に貼り付けます。
5. ブラウザソースの幅は8枠とGuestを表示できる程度に設定してください。初期設定のアバター104px・間隔14pxでは、Guest 3人まで含め約1300px必要です。

固定メンバーの欠席位置は空白のまま残ります。9人目以降のゲストは、StreamKitが出す順序のままD4の右に並び、ロールラベルは付きません。CSSにはVC参加時刻が渡らないため、StreamKit自体が参加順以外で並べる場合、その順序まではCSSだけで変えられません。

## 対応するStreamKit構造

生成CSSは `ul.voice_states > li.voice_state[data-userid] > img.voice_avatar`、名前の `.voice_username`、発話時の `li.wrapper_speaking` を使います。ハッシュ付きReact classには依存しません。2026年9月29日に提供されたVC URLで参加者6人分の実要素を確認し、これらのセレクタと発話classが一致しました。参考として[StreamKitのライブバンドルを検証した公開実装](https://github.com/cuppyzh/OBS-Discord-Overlay)も確認しています。

実際のOBSで、1人がVCへ入った状態でID固定・表示名・発話エフェクトを確認してください。Discord側のDOMが変わった場合は、対象ブラウザソースを開発者ツールで調べ、生成CSSのセレクタを更新する必要があります。

## 設定データ

設定はブラウザの `localStorage` に自動保存されます。「設定保存」で手動保存もでき、JSONのエクスポート・インポートで移せます。Discord IDはサイトから外部へ送信しません。GitHub Pagesで公開しても、保存先は閲覧した端末のブラウザです。
