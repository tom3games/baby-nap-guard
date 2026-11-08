// 寝かしつけ防衛戦。文言とデータ（[日本語, English]）。仕様の正本は ~/Desktop/claudecode/ideas/baby-nap-guard.md
window.BN = {
  T: {
    title1: ['赤ちゃんを起こすな', "Don't Wake the Baby"],
    title2: ['寝かしつけ防衛戦', 'Nap Defense'],
    sub: ['15時まで起こさなければ勝ち', 'Keep the baby asleep until 3 PM'],
    sign: ['赤ちゃんが寝ています', 'BABY SLEEPING'],
    start: ['そーっと始める', 'Start, quietly'],
    how: ['遊び方', 'How to play'],
    lang: ['English', '日本語'],
    close: ['わかった', 'Got it'],
    privacy: ['プライバシー', 'Privacy'],
    again: ['もう一回寝かす', 'Try again'],
    save: ['画像を保存', 'Save image'],
    post: ['Xでポスト', 'Post on X'],
    more: ['ほかのバカゲーも遊ぶ', 'More silly games'],
  },
  HOWTO: {
    rules: [
      [['端まで来たら、押す', 'Push at the end of the swing'], ['揺りかごが端で止まった瞬間にタップ。途中で押すとガタッ。押しすぎも起きる', 'Tap the cradle the moment it stops at one end. Mid-swing taps jolt. Too much swinging wakes the baby too']],
      [['鳴る前に、止める', 'Stop noises before they start'], ['影・耳・ほっぺ・光。気配が出た所をタップ。連打が要る物もある。手は1本なので、揺らす手が一瞬止まる', 'A shadow, perked ears, puffed cheeks, a lit screen. Tap it, some need several taps. You only have one hand, so the cradle waits']],
      [['鼻ちょうちんが命', 'Watch the snot bubble'], ['ふくらんでいれば熟睡。割れたら起きかけ。泣ききったら、終わり', 'Big bubble, deep sleep. If it pops, the baby is stirring. If the baby cries it out, it is over']],
    ],
    warn: ['泣かせきったら、赤ちゃんが本気を出す', 'Make the baby cry it out, and the baby gets serious'],
  },
  // 初めての1回、遊びの中で出す一文（止まって待たない）
  HINT: {
    push: ['端に来たら、揺りかごをタップ', 'Tap the cradle at the end of the swing'],
    jolt: ['途中で押すとガタッ。端で押す', 'Not mid-swing. Push at the end'],
    noise: ['気配の所をタップして止める', 'Tap the noise maker to stop it'],
    strong: ['揺らしすぎ。少し待つ', 'Too much. Let it settle'],
    multi: ['連打で止める', 'Tap it again to stop it'],
    thunder: ['光った！鳴る前に窓をタップ', 'Lightning! Tap the window before the boom'],
    vacuum: ['動く掃除機を追ってタップ', 'Chase the vacuum and tap it'],
  },
  // 邪魔者。warn=気配の秒数、drain=鳴っている間に眠りが減る量（毎秒）、one=一発で減る量、len=放っておくと鳴る秒数
  NOISE: {
    bell: { name: ['宅配のチャイム', 'Doorbell'], say: ['ピンポーン！お届けものでーす！', 'Ding-dong! Delivery!'], done: ['置き配で…', 'Leave it at the door...'], warn: 3.2, drain: 14, len: 5.5 },
    dog: { name: ['犬', 'Dog'], say: ['ワン！ワンワン！', 'Woof! Woof woof!'], done: ['（ガジガジ）', '(chew chew)'], warn: 2.8, drain: 13, len: 7 },
    kid: { name: ['上の子のラッパ', 'Big brother'], say: ['プァ〜〜〜！', 'PARP!'], done: ['しーっ', 'Shhh'], warn: 2.6, drain: 18, len: 3.5 },
    phone: { name: ['スマホ', 'Phone'], say: ['ブブブ…ママ友から87件', 'Bzzz... 87 messages'], done: ['（伏せた）', '(face down)'], warn: 2.6, drain: 8, len: 6 },
    karaoke: { name: ['隣のカラオケ', 'Neighbor karaoke'], say: ['あ〜い〜を〜〜（熱唱）', 'LO-O-OVE (belting)'], done: ['…すみません', '...sorry'], warn: 3.0, drain: 7, len: 12 },
    sneeze: { name: ['パパのくしゃみ', "Dad's sneeze"], say: ['ぶぇっくしょい！！', 'AH-CHOOOO!'], done: ['（むぐっ）', '(mmph)'], warn: 2.4, one: 34, len: 0.6 },
    car: { name: ['選挙カー', 'Campaign car'], say: ['ねむ田すや男でございます！', 'Vote for Snooze McNap!'], done: ['（窓を閉めた）', '(window shut)'], warn: 3.4, drain: 10, len: 6 },
    clock: { name: ['鳩時計', 'Cuckoo clock'], say: ['ポッポー！ポッポー！', 'Cuckoo! Cuckoo!'], done: ['（くちばしを押さえた）', '(beak held)'], warn: 2.6, one: 26, len: 0.6 },
    // まれ
    imo: { name: ['焼き芋屋', 'Sweet potato truck'], say: ['い〜しや〜きいも〜', 'Ho-o-ot sweet potatoes!'], done: ['（窓を閉めた）', '(window shut)'], warn: 3.4, drain: 9, len: 8 },
    gran: { name: ['ばあばのビデオ通話', "Grandma's video call"], say: ['見せて〜！赤ちゃん見せて〜！', 'Show me the baby!'], done: ['（あとでかけ直す）', '(call you later)'], warn: 2.6, drain: 12, len: 6 },
    // v2: 場面ごとに足す新しいこと
    kid2: { name: ['上の子のシンバル', 'Cymbals'], say: ['ジャーン！ジャーン！', 'CRASH! CRASH!'], done: ['（シンバル没収）', '(cymbals confiscated)'], warn: 2.8, drain: 20, len: 4, need: 2 },
    kid3: { name: ['上の子の和太鼓', 'Taiko drum'], say: ['ドドン！ドンドコドン！', 'DON! DON-DOKO-DON!'], done: ['（バチ没収）', '(sticks confiscated)'], warn: 3.0, drain: 24, len: 5, need: 4 },
    thunder: { name: ['雷', 'Thunder'], say: ['ゴロゴロ…ドーン！', 'Rumble... BOOM!'], done: ['（窓とカーテンを閉めた）', '(window and curtains shut)'], warn: 2.6, one: 26, len: 0.8 },
    vacuum: { name: ['起きたパパの掃除機', "Dad's vacuum"], say: ['手伝うよー！（ブォォォ）', "I'll help! (VRRRMM)"], done: ['あ、ごめん…', 'Oh, sorry...'], warn: 2.4, drain: 11, len: 9 },
    granvisit: { name: ['ばあば到着', 'Grandma arrives'], say: ['来ちゃった〜！孫は〜？', 'Surprise! Where is my grandbaby?'], done: ['（しーっ、と入ってもらった）', '(shushed her in)'], warn: 3.0, drain: 16, len: 6, need: 3 },
  },
  // 13:00〜15:00 を4つの場面に分ける。場面ごとに新しい邪魔者か状況を1つ足す（v2）
  SCENES: [
    { at: 0, t: ['13:00 お昼寝スタート', '1:00 PM  Nap time'] },
    { at: 30, t: ['13:30 お兄ちゃん帰宅', '1:30 PM  Big brother is home'] },
    { at: 60, t: ['14:00 夕立', '2:00 PM  Thunderstorm'] },
    { at: 90, t: ['14:30 ばあば襲来', '2:30 PM  Grandma incoming'] },
  ],
  CLIMAX: ['全員集合！', 'Everyone at once!'],
  COMBO: ['チャイムで犬も！', 'The doorbell sets off the dog!'],
  // 起こした原因で変わる劇画の一言
  CAUSE: {
    jolt: ['……揺らし方から、教えてやろうか', '...Want me to teach you how to rock a cradle?'],
    strong: ['揺らしすぎだ。……酔うだろうが', "Too much swinging. You'll make me sick."],
    weak: ['止めるな。……揺らし続けろと言ったはずだ', 'Never stop. I told you to keep rocking.'],
    bell: ['置き配って言葉を、知ってるか', 'Ever heard of "leave it at the door"?'],
    dog: ['犬のしつけは、飼い主の仕事だ', "Training the dog is the owner's job."],
    kid: ['兄貴に伝えとけ。……次はないとな', "Tell my brother. There won't be a next time."],
    kid2: ['シンバルは、俺が預かる', "I'll be keeping the cymbals."],
    kid3: ['祭りは終わりだ', 'The festival is over.'],
    phone: ['通知は、切っておけ', 'Turn off your notifications.'],
    gran: ['ばあば。……抱っこは後だ', 'Grandma. Hugs can wait.'],
    granvisit: ['ばあば。……抱っこは後だ', 'Grandma. Hugs can wait.'],
    karaoke: ['隣に伝えろ。……音、外れてるとな', 'Tell the neighbor. He is off-key.'],
    sneeze: ['そのくしゃみ、高くつくぜ', 'That sneeze will cost you.'],
    car: ['選挙の前に、俺の昼寝だ', 'My nap comes before your election.'],
    imo: ['芋は後で、もらっておく', "I'll take the sweet potato later."],
    clock: ['時間は守れ。……だが鳴らすな', 'Keep time. Just keep it quiet.'],
    thunder: ['雷より怖いもんを、教えてやる', "I'll show you something scarier than thunder."],
    vacuum: ['吸い込むのは、ほこりだけにしな', 'Only suck up the dust, pal.'],
  },
  WIN_GEKIGA: ['……悪くない昼寝だった', '...Not a bad nap.'],
  // 寝言（遊びには関係しない）
  SLEEPTALK: [['……まんま', '...mama'], ['……ぶー', '...bwuh'], ['……むにゃ', '...mnya']],
  PAPATALK: [['むにゃ…もう食べられへん…', 'mnya... no more cake...'], ['…手伝う…あとで…', '...I will help... later...']],
  EYE: ['……', '……'],
  // 泣かせきった後。渋い顔で銃を構えて、一言で暗転
  GEKIGA: [
    ['……次はないぞ', '...There will be no next time.'],
    ['夜泣きは終わった。お前の番だ', 'Crying is over. Your turn now.'],
    ['昼寝の邪魔は、高くつくぜ', 'Waking me up costs extra.'],
    ['ミルクの時間だ。……お前の分はない', "It's milk time. None for you."],
    ['ガラガラで済むと思うなよ', "Don't think a rattle fixes this."],
  ],
  WIN: [['よく寝た', 'Good nap'], ['ばぶ！', 'Ba-bu!']],
  // 称号（上から順に当てる）
  TITLES: [
    { min: 92, t: ['伝説の寝かしつけ師', 'Legendary Nap Whisperer'] },
    { min: 80, t: ['ベテラン子守', 'Veteran Babysitter'] },
    { min: 65, t: ['なんとか寝かせた人', 'Barely Pulled It Off'] },
    { min: 0, t: ['よく起こさなかった', 'Somehow It Stayed Asleep'] },
  ],
  KO_TITLES: [
    { sec: 90, t: ['あと少しで消された人', 'Erased Near the Finish'] },
    { sec: 45, t: ['ターゲット', 'The Target'] },
    { sec: 0, t: ['即、消される人', 'Erased on Sight'] },
  ],
}
