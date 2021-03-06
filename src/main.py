import logging

from slack_bolt import App, Ack
from slack_bolt.adapter.flask import SlackRequestHandler
from slack_sdk import WebClient

from data_service import add_faq, search
from language_service import analyze_entities

logging.basicConfig(level=logging.DEBUG)

# process_before_response must be True when running on FaaS
app = App(process_before_response=True)
# Flask adapter
handler = SlackRequestHandler(app)


# https://slack.dev/bolt-python/ja-jp/concepts#opening-modals
@app.shortcut("add_faq_modal")
def add_faq_modal(ack, body, client):
    ack()
    client.views_open(
        trigger_id=body["trigger_id"],
        # ビューのペイロード
        view={
            "type": "modal",
            "callback_id": "add_faq_modal_view",
            "title": {"type": "plain_text", "text": "FAQを追加する"},
            "submit": {"type": "plain_text", "text": "追加"},
            "blocks": [
                {
                    "type": "input",
                    "block_id": "input_question",
                    "label": {"type": "plain_text", "text": "質問文"},
                    "element": {
                        "type": "plain_text_input",
                        "multiline": True,
                        "action_id": "action_input_question",
                    }
                },
                {
                    "type": "input",
                    "block_id": "input_answer",
                    "label": {"type": "plain_text", "text": "回答文"},
                    "element": {
                        "type": "plain_text_input",
                        "multiline": True,
                        "action_id": "action_input_answer",
                    }
                },
            ]
        }
    )


# https://slack.dev/bolt-python/ja-jp/concepts#view_submissions
@app.view("add_faq_modal_view")
def add_faq_modal_view_submission(ack: Ack, body: dict, client: WebClient, logger):
    ack()

    input_values = body["view"]["state"]["values"]
    logger.info(input_values)
    question = input_values['input_question']['action_input_question']['value']
    answer = input_values['input_answer']['action_input_answer']['value']

    q_analyzed = analyze_entities(question)
    a_analyzed = analyze_entities(answer)

    client.chat_postMessage(
        channel=body["user"]["id"],
        text=f"You submitted"
             f"\nQ. {q_analyzed.text}"
             f"\nA. {a_analyzed.text}"
             f"\n<analyzed keywords>"
             f"\n- question: {q_analyzed}"
             f"\n- answer: {a_analyzed}"
    )
    add_faq(q_analyzed, a_analyzed)


@app.command("/faq")
def search_faq(ack, respond, command):
    ack()

    question: str = command['text']
    analyzed = analyze_entities(question)

    q_text, a_text = search(analyzed)
    respond(f"{question}\n\nQ. {q_text}\nA. {a_text}")


# Cloud Function
def faq_add(request):
    """HTTP Cloud Function.
    Args:
        request (flask.Request): The request object.
        <https://flask.palletsprojects.com/en/1.1.x/api/#incoming-request-data>
    Returns:
        The response text, or any set of values that can be turned into a
        Response object using `make_response`
        <https://flask.palletsprojects.com/en/1.1.x/api/#flask.make_response>.
    """
    return handler.handle(request)
