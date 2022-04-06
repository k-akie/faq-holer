# faq-holer

FAQとして質問文と回答文の凡例を登録しておき、質問に近いFAQを返すSlackボットです

## アーキテクチャ
- Cloud Functions
  - Python 3.9
- Firestore

## 処理フロー
```mermaid
flowchart LR
    SlackBot -- shortcut:\nadd_faq_modal --> add_faq_modal -- submit --> add_faq_modal_view_submission -- add --> answer
    SlackBot -- command:\n/faq --> search_faq -- get --> question
    search_faq -- get --> answer
    search_faq -- add --> history
    subgraph Firestore
        answer
        content
        history
    end
    subgraph Cloud Functions
        add_faq_modal
        add_faq_modal_view_submission
        search_faq
    end
```

## デプロイ
### gcloud CLI
```bash
cd ./src
gcloud functions deploy faq_add \
--runtime python39 \
--trigger-http \
--region asia-northeast2 \
--security-level secure-always \
--env-vars-file .env.yaml \
--allow-unauthenticated
```