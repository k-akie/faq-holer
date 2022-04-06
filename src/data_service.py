import datetime

from google.cloud import firestore
from google.cloud.firestore_admin_v1 import Field
from google.cloud.firestore_v1 import DocumentReference

from language_service import Analyzed

db = firestore.Client()


def add_faq(q_analyzed: Analyzed, a_analyzed: Analyzed):
    doc_ref: [Field, DocumentReference] = db.collection('faq').add({
        'q_text': q_analyzed.text,
        'q_entity': [{'name': entity.name, 'salience': entity.salience} for entity in q_analyzed.entities],
        'q_language': q_analyzed.language,
        'a_text': a_analyzed.text,
        'a_entity': [{'name': entity.name, 'salience': entity.salience} for entity in a_analyzed.entities],
        'a_language': a_analyzed.language,
        'created': datetime.datetime.now(tz=datetime.timezone.utc),
    })

    doc, ref = doc_ref
    for entity in q_analyzed.entities:
        db.collection('content').document(entity.name).set({
            'faq': [{'salience': entity.salience, 'faq_id': ref.id}]
        }, merge=True)


def search(analyzed: Analyzed) -> (str, str):
    questioned = datetime.datetime.now(tz=datetime.timezone.utc).isoformat()

    # 質問文からキーワードを特定
    keyword = analyzed.entities[0].name
    content = db.collection('content').document(keyword).get()

    if content.exists:
        answer_id: str = content.get('faq')[0].get('faq_id')

        # 履歴の登録
        db.collection('history').document(questioned).set({
            'text': analyzed.text,
            'entity': [{'name': entity.name, 'salience': entity.salience} for entity in analyzed.entities],
            'language': analyzed.language,
            'faq_id': answer_id,
            'created': datetime.datetime.now(tz=datetime.timezone.utc),
        })

        # 回答の取得
        answer_ref = db.collection('faq').document(answer_id)
        answer = answer_ref.get()
        q_text: str = answer.get('q_text')
        a_text: str = answer.get('a_text')
        return q_text, a_text
    else:
        # 履歴の登録
        db.collection('history').document(questioned).set({
            'q_text': analyzed.text,
            'entity': [{'name': entity.name, 'salience': entity.salience} for entity in analyzed.entities],
            'language': analyzed.language,
            'created': datetime.datetime.now(tz=datetime.timezone.utc),
        })
        return '', ''
