# Habit App Design

## 1. Product Concept

習慣を「記録する」だけでなく、「小さく始めて、振り返りながら育てる」ためのブラウザアプリ。

ユーザーは if-then ルールで習慣を登録し、日々の達成を記録する。1週間または2週間ごとに達成率と体感難易度を振り返り、目標を少し上げる・維持する・下げる・条件を変える判断を行う。

将来的には PWA 化、Supabase 同期、iPhone アプリ化を見据える。

## 2. Target Users

- 習慣化したいが、目標を大きくしすぎて挫折しがちな人
- 達成記録だけでなく、なぜ続けたいのかを見失いたくない人
- 友人にもすすめられる、ログインして自分の習慣を管理できる軽量アプリを求める人

## 3. Core Principles

### 3.1 Small Start

習慣登録時に「目標」と「最小達成条件」を分ける。

例:

- 目標: 30分読書する
- 最小達成条件: 1ページ読む

記録上の達成判定は最小達成条件を満たしたかで行う。

### 3.2 If-Then Rule

習慣は以下の形式で登録する。

```text
もし [既存の行動・時間・場所・状況] なら、[新しい行動] をする
```

例:

```text
もし朝コーヒーを淹れたら、英単語を5個見る
```

### 3.3 Motivation Library

習慣ごとに、複数のメリットをタグ付きで保存する。

例:

```text
朝から自己肯定感が上がる #短期 #自信
将来の健康不安が減る #長期 #健康
仕事前に頭がすっきりする #短期 #仕事
```

これらは登録時だけでなく、今日の習慣画面やレビュー画面にも表示する。固定の短期・中期・長期欄ではなく、ユーザー自身の言葉を貯める「理由ライブラリ」として扱う。

### 3.4 Adaptive Growth

1週間または2週間ごとに達成率を確認する。

基本ルール:

- 達成率 90%以上 かつ 体感が「簡単」: 目標を少し上げる提案
- 達成率 90%以上 かつ 体感が「ちょうどいい/きつい」: 維持を提案
- 達成率 70%〜89%: 維持または条件調整を提案
- 達成率 70%未満: 最小達成条件を小さくする提案

成長幅は約10%を目安にするが、ユーザーが最終決定する。

## 4. MVP Scope

### 4.1 Included

- メールまたはOAuthログイン
- 習慣の作成・編集・削除
- if-then ルールの登録
- 単発習慣 / ルーティン習慣の登録
- ルーティンのステップ別記録
- ルーティンのつまずきポイント可視化
- 最小達成条件の登録
- タグ付きメリットライブラリの登録
- 今日の習慣一覧
- 達成/未達の記録
- 達成履歴の表示
- 7日/14日ごとのレビュー
- 達成率に基づく調整提案

### 4.2 Not Included In MVP

- 友達との共有
- ランキング
- 課金
- AIコーチング
- iOSネイティブアプリ
- 複雑な通知最適化

## 5. Recommended Tech Stack

### 5.1 Frontend

- Vite
- React
- TypeScript
- Tailwind CSS
- React Router
- TanStack Query
- date-fns

理由:

- ブラウザで軽く動く
- PWA化しやすい
- 将来的に React Native / Expo へ思想を移しやすい
- GitHub Pages / Vercel / Netlify に載せやすい

### 5.2 Backend

- Supabase Auth
- Supabase Postgres
- Supabase Row Level Security
- Supabase Edge Functions, 必要になってから

理由:

- ログイン・DB・認可をまとめて扱える
- 個人開発から友人向け公開まで進めやすい
- RLS によりユーザーごとのデータ分離がしやすい

### 5.3 Hosting

推奨:

- Vercel

代替:

- Netlify
- GitHub Pages

Supabase Auth のリダイレクトや環境変数の扱いやすさを考えると、最初は Vercel が楽。

## 6. User Flow

### 6.1 First Visit

1. ランディングではなく、ログイン/サインアップを表示
2. 初回ログイン後、最初の習慣作成へ誘導
3. 作成後、今日の習慣画面へ移動

### 6.2 Create Habit

入力項目:

- 習慣名
- if 条件
- then 行動
- 最小達成条件
- 頻度
- レビュー周期
- 成長タイプ
- タグ付きメリット

成長タイプ:

- 量を増やす
- 時間を増やす
- 頻度を増やす
- 難度を上げる
- 維持する

### 6.3 Daily Check-in

今日対象の習慣を一覧表示する。

各習慣でできること:

- 達成
- 未達
- スキップ
- メモ追加
- メリット確認

未達時は責める表現を避け、必要なら理由を選べるようにする。

未達理由:

- 忘れた
- 忙しかった
- 難しすぎた
- 体調/気分
- その他

### 6.4 Review

レビュー対象期間が終わった習慣に対し、レビュー画面を表示する。

表示:

- 期間
- 達成日数
- 対象日数
- 達成率
- メモ
- タグ付きメリット

入力:

- 体感難易度: 簡単 / ちょうどいい / きつい
- 次の調整: 上げる / 維持 / 下げる / 条件変更

## 7. Screen Design

### 7.1 Routes

```text
/login
/today
/habits
/habits/new
/habits/:habitId
/habits/:habitId/edit
/reviews
/reviews/:reviewId
/settings
```

### 7.2 Main Screens

#### Today

- 今日の対象習慣
- 達成ボタン
- 最小達成条件
- 今日やる理由としてタグ付きメリット

#### Habits

- 登録済み習慣一覧
- 達成率サマリー
- 次回レビュー日
- 有効/停止ステータス

#### Habit Detail

- if-then ルール
- メリット
- 達成履歴
- 最近のメモ
- 調整履歴

#### Review

- 達成率
- 体感難易度
- アプリからの提案
- ユーザーの決定

## 8. Data Model

### 8.1 profiles

Supabase Auth の `auth.users` と 1:1。

```sql
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  timezone text not null default 'Asia/Tokyo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### 8.2 habits

```sql
create table habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  if_trigger text not null,
  then_action text not null,
  minimum_success text not null,
  short_benefit text,
  mid_benefit text,
  long_benefit text,
  benefits jsonb not null default '[]'::jsonb,
  frequency_type text not null check (frequency_type in ('daily', 'weekdays', 'weekly')),
  weekly_target_count integer,
  review_interval_days integer not null check (review_interval_days in (7, 14)),
  growth_type text not null check (growth_type in ('amount', 'duration', 'frequency', 'difficulty', 'maintain')),
  current_target_value numeric,
  current_target_unit text,
  status text not null default 'active' check (status in ('active', 'paused', 'archived')),
  start_date date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### 8.3 habit_logs

```sql
create table habit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  habit_id uuid not null references habits(id) on delete cascade,
  log_date date not null,
  status text not null check (status in ('done', 'missed', 'skipped')),
  note text,
  missed_reason text check (missed_reason in ('forgot', 'busy', 'too_hard', 'condition', 'other')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (habit_id, log_date)
);
```

### 8.4 habit_reviews

```sql
create table habit_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  habit_id uuid not null references habits(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  target_days integer not null,
  done_days integer not null,
  success_rate numeric not null,
  perceived_difficulty text check (perceived_difficulty in ('easy', 'good', 'hard')),
  app_suggestion text not null check (app_suggestion in ('increase', 'maintain', 'decrease', 'adjust')),
  user_decision text check (user_decision in ('increase', 'maintain', 'decrease', 'adjust')),
  decision_note text,
  created_at timestamptz not null default now()
);
```

### 8.5 habit_adjustments

```sql
create table habit_adjustments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  habit_id uuid not null references habits(id) on delete cascade,
  review_id uuid references habit_reviews(id) on delete set null,
  previous_target_value numeric,
  next_target_value numeric,
  previous_target_unit text,
  next_target_unit text,
  previous_minimum_success text,
  next_minimum_success text,
  reason text,
  created_at timestamptz not null default now()
);
```

## 9. Row Level Security

全テーブルで RLS を有効にする。

基本方針:

- 自分の `user_id` の行だけ select/insert/update/delete 可能
- `profiles.id = auth.uid()`
- `habits.user_id = auth.uid()`
- `habit_logs.user_id = auth.uid()`
- `habit_reviews.user_id = auth.uid()`
- `habit_adjustments.user_id = auth.uid()`

例:

```sql
alter table habits enable row level security;

create policy "Users can manage own habits"
on habits
for all
using (user_id = auth.uid())
with check (user_id = auth.uid());
```

同様のポリシーを各テーブルに設定する。

## 10. Business Logic

### 10.1 Today's Habits

`habits` から `status = 'active'` の習慣を取得し、頻度設定と今日の日付から対象習慣を判定する。

初期実装ではフロントエンドで判定してよい。

将来的にユーザー数が増えたら SQL function または Edge Function に切り出す。

### 10.1.1 Routine Habits

単発習慣は1ステップのルーティンとして扱う。

ルーティン習慣は以下を保存する。

```text
開始トリガー: 朝起きたら
ステップ1: 水を飲む
ステップ2: 体重計に乗る
ステップ3: 着替える
ステップ4: 散歩する
```

日次ログには完了したステップIDを保存する。

```json
{
  "completedStepIds": ["step-1", "step-2"]
}
```

レビューでは以下を表示する。

- 開始率: 最初のステップに入れた日数 / 対象日数
- 完了率: 最後のステップまで終えた日数 / 対象日数
- ステップ別達成率
- ステップ間通過率が最も低い接続

例:

```text
つまずき: 着替える → 散歩する
通過率: 53%
```

### 10.2 Success Rate

対象期間内の `habit_logs` を集計する。

```text
success_rate = done_days / target_days * 100
```

`skipped` は原則として対象日数から除外する。ただし、設定で「スキップも未達扱い」に切り替えられる余地を残す。

### 10.3 Growth Suggestion

```text
if success_rate >= 90 and perceived_difficulty == easy:
  suggestion = increase
elif success_rate >= 90:
  suggestion = maintain
elif success_rate >= 70:
  suggestion = maintain or adjust
else:
  suggestion = decrease
```

数値目標がある場合:

```text
next_target = current_target * 1.1
```

ただし単位に応じて丸める。

- 回数: 整数に丸める
- 分: 1分単位
- ページ: 整数
- 個数: 整数

## 11. Authentication

MVPでは以下を推奨。

- Email magic link
- Google OAuth

友達にすすめる前提なら、Google OAuth があると登録の心理的負担が低い。

Supabase Auth 設定:

- Site URL: 本番URL
- Redirect URLs:
  - `http://localhost:5173/**`
  - 本番URL `/**`

## 12. Deployment

### 12.1 Recommended

- GitHub repository
- Vercel connected to GitHub
- Supabase project

### 12.2 Environment Variables

```text
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

クライアントでは anon key のみ使う。service role key は絶対にフロントエンドに置かない。

## 13. Development Phases

### Phase 1: Local MVP

- Vite React App 作成
- localStorage で仮保存
- 習慣作成
- 今日の習慣
- 達成記録
- 簡易レビュー

目的:

アプリ体験を早く確認する。

### Phase 2: Supabase Integration

- Supabase Auth
- DB migration
- RLS
- habit CRUD
- logs sync
- reviews sync

目的:

友達にも使ってもらえる状態に近づける。

### Phase 3: PWA

- manifest
- service worker
- iPhone ホーム画面追加対応
- モバイルUI調整

目的:

iPhoneアプリ化前に、スマホで毎日使える状態を作る。

### Phase 4: Sharing And Refinement

- 招待制の友達利用
- フィードバック収集
- 通知設計
- 使われていない機能の整理

### Phase 5: Native App Consideration

- Expo / React Native 移行を検討
- Supabase は継続利用
- Web とモバイルで共有できるロジックを整理

## 14. GitHub Repository Structure

```text
habit/
  docs/
    design.md
  supabase/
    migrations/
  src/
    app/
    components/
    features/
      auth/
      habits/
      logs/
      reviews/
    lib/
      supabase/
      dates/
    routes/
    styles/
  public/
  package.json
  README.md
```

## 15. Initial Implementation Priority

1. React + TypeScript + Tailwind のセットアップ
2. データ型定義
3. localStorage 版の習慣CRUD
4. 今日の習慣チェック画面
5. レビュー計算ロジック
6. Supabase schema migration
7. Supabase Auth
8. DB同期
9. Vercel デプロイ
10. PWA化

## 16. Open Questions

- 友達に公開するタイミングで、完全公開にするか招待制にするか
- 通知は Web Push までやるか、まずはアプリ内表示だけにするか
- 週次レビューを自動生成するか、ユーザーがレビュー画面を開いた時に生成するか
- 習慣の頻度設定をどこまで細かくするか
- 未達理由を分析に使うか、メモ程度に留めるか

## 17. Recommended First Build

最初は Supabase をいきなり完全実装せず、UIと習慣化体験を固める。

おすすめ順:

1. localStorage で動くプロトタイプ
2. 実際に1週間自分で使う
3. 入力項目やレビューの重さを調整
4. Supabase に接続
5. 友達に限定公開

この順番にすると、DBや認証を作り込んだ後で体験設計を大きく変えるリスクを減らせる。
