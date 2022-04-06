# https://cloud.google.com/natural-language/docs/analyzing-entities#language-entities-string-python
from google.cloud import language_v1
from google.cloud.language_v1 import AnalyzeEntitiesResponse


class AnalyzedEntity:
    name: str
    salience: float

    def __init__(self, _name, _salience):
        self.name = _name
        self.salience = _salience

    def __str__(self) -> str:
        return f'{self.name}: {self.salience}'


class Analyzed:
    text: str
    language: str
    entities: [AnalyzedEntity]

    def __init__(self, _text, _language, _entity):
        self.text = _text
        self.language = _language
        self.entities = _entity

    def __str__(self) -> str:
        return self.text + '(' + self.language + '), entities[' + ', '.join(map(str, self.entities)) + ']'


def analyze_entities(text_content):
    """
    Analyzing Entities in a String

    Args:
      text_content The text content to analyze
    """

    client = language_v1.LanguageServiceClient()
    response: AnalyzeEntitiesResponse = client.analyze_entities(request={
        'document': {"content": text_content, "type_": language_v1.Document.Type.PLAIN_TEXT},
        'encoding_type': language_v1.EncodingType.UTF8
    })

    # https://cloud.google.com/natural-language/docs/reference/rest/v1/Entity#Type
    return Analyzed(
        text_content,
        response.language,
        [AnalyzedEntity(entity.name, entity.salience) for entity in response.entities]
    )
