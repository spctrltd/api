# Adding Database Models
Specify an absolute path to your project's models.
```JS
{
  database: {
    userDataModelsPath: `${path.resolve('.')}/config/model`
  }
}
```
Files are JSON format, with the name of the file as the model name: eg. `article.json`.
The file structure is as follows:
```JSON
{
  "model": {
    "id": "ObjectId",
    "title": "String",
    "body": "String",
    "userId": {"type": "ObjectId", "required": true}
  },
  "schema": {
    "virtuals": {
      "author": {
        "localField": "userId",
        "ref": "profile",
        "foreignField": "userId",
        "justOne": true
      }
    }
  },
  "test": {
    "202": {
      "label": "Insert an article",
      "operation": "insert",
      "success": {
        "match": "both",
        "parameters": [
          {
            "userId": "[$cache$200$userId]",
            "title": "this is a title",
            "body": "here is the body"
          }
        ],
        "response": {
          "userId": "[$cache$200$userId]",
          "title": "this is a title",
          "body": "here is the body"
        }
      }
    },
    "203": {
      "label": "Insert another article",
      "operation": "insert",
      "success": {
        "match": "both",
        "parameters": [
          {
            "userId": "[$cache$200$userId]",
            "title": "this is another title",
            "body": "here is the other body"
          }
        ],
        "response": {
          "userId": "[$cache$200$userId]",
          "title": "this is another title",
          "body": "here is the other body"
        }
      }
    },
    "204": {
      "label": "Select from article",
      "operation": "find",
      "success": {
        "match": "both",
        "parameters": [
          {
            "userId": "[$cache$202$userId]"
          },
          {
            "populate": ["author"]
          }
        ],
        "response": [
          {
            "userId": "[$cache$202$userId]",
            "id": "[$cache$202$id]",
            "title": "this is a title",
            "body": "here is the body",
            "author": {
              "userId": "[$cache$202$userId]",
              "name": "Bobby",
              "surname": "Fet"
            }
          },
          {
            "userId": "[$cache$203$userId]",
            "id": "[$cache$203$id]",
            "title": "this is another title",
            "body": "here is the other body",
            "author": {
              "userId": "[$cache$203$userId]",
              "name": "Bobby",
              "surname": "Fet"
            }
          }
        ]
      }
    }
  }
}
```