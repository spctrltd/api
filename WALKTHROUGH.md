# Database Connections
Under the hood the app uses Mongoose for MongoDB connections and Sequelize for SQL connections. Only MongoDB and SQLite connections are currently supported. The database functions were designed to be database-independent even though you'd find the syntax leaning more towards Mongoose functions than typical SQL functions (select, join, etc). If you need to switch databases for whatever reason you shouldn't need to rewrite any of your functions or configs.
In your controllers you will be able to access database funtions via `ctx.DBO`:
```JS
export default async ctx => {
  const {id: userId} = await ctx.helper.getAuthenticatedUser(ctx)
  const articles = await ctx.DBO.article.find({userId}, {populate: [{path: 'author', select: {name: 1, surname: 1}}]})
  ctx.body = ctx.helper.formatedResponse({articles})
}
```

# Adding Database Models
Specify an absolute path to your project's models in the database config.
```JS
{
  database: {
    userDataModelPath: `${path.resolve('.')}/config/model`
  }
}
```
Model configs are JSON files, with the name of the file as the model name: eg. `article.json`. The model name is not pluralised or altered by Mongoose or Sequelize so it will always be referencable by the file name in your database and the code.
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
Although the model structure is primarily designed to be used with MongoDB, if you keep it simple enough it can be interoparable with SQL. More specifically the Sequelize syntax.
In the `model` section the following data types are supported:

```JS
'String'
'Boolean'
'Date'
'Number'
'ObjectId' // set to INTEGER in SQLite
'Mixed' // set to BLOB in SQLite
```
Attributes like `"required": true` or `"default": 1` have the same syntax in Sequelize.

In the `schema` section only the following attributes are passed through:
```JS
{
  // standard Mongoose attributes, see Mongoose docs
  timestamps = true,
  versionKey = false,
  toJSON = {},
  toObject = {},
  virtuals, // defaults to undefined.
  /* virtuals:
  on mongodb functions as documented.
  on SQL it creates a hasMany or hasOne relationship.
  see further down for example
  */ 
  // custom attributes
  encryptPassword = false, // if true, encrypts the passwordField upon create or update
  passwordField = ['password'], // if encryptPassword = true, encrypts all fields in the array
  idField = 'id',
  /* idField:
  sets the primary key field to ensure all
  database types reference the right field
  (since mongodb uses _id and SQL generally uses id)
  Not advisable to change yet.
  Usage of anything other than id requires proper auditing/testing.
  */
}
```
Virtuals are used instead of the `ref` attribute to populate relations:
```JSON
{
  "virtuals": {
    "author": {
      "localField": "userId",
      "ref": "profile",
      "foreignField": "userId",
      "justOne": true
    }
  }
}
```
In this example `justOne` is a non-standard attribute used only on SQL to specify just one record or all.
So, a query like this:
```JS
const articles = await ctx.DBO.article.find({userId}, {populate: [{path: 'author', select: {name: 1, surname: 1}}]})
```
Will yield:
```JSON
[
  {
    "_id": "642bc0469ca5b87603eced87",
    "title": "this is a title",
    "body": "here is the body",
    "userId": "642bc0459ca5b87603eced7a",
    "createdAt": "2023-04-04T06:14:30.271Z",
    "updatedAt": "2023-04-04T06:14:30.271Z",
    "id": "642bc0469ca5b87603eced87",
    "author": {
      "_id": "642bc0469ca5b87603eced84",
      "userId": "642bc0459ca5b87603eced7a",
      "name": "Bobby",
      "surname": "Fet",
      "isActive": true,
      "createdAt": "2023-04-04T06:14:30.241Z",
      "updatedAt": "2023-04-04T06:14:30.265Z",
      "id": "642bc0469ca5b87603eced84"
    }
  }
]
```
And this example without `justOne`:
```JSON
{
  "virtuals": {
    "user": {
      "localField": "userId",
      "ref": "accountuser",
      "foreignField": "id",
      "justOne": true
    },
    "articles": {
      "localField": "userId",
      "ref": "article",
      "foreignField": "userId"
    }
  }
}
```
Using:
```JS
const profile = await ctx.DBO.profile.findOne({id}, {populate: ['articles', {path: 'user', select: {email: 1}}]})
```
Will yield:
```JSON
{
  "_id": "642bc0469ca5b87603eced84",
  "userId": "642bc0459ca5b87603eced7a",
  "name": "Bobby",
  "surname": "Fet",
  "isActive": true,
  "createdAt": "2023-04-04T06:14:30.241Z",
  "updatedAt": "2023-04-04T06:14:30.265Z",
  "id": "642bc0469ca5b87603eced84",
  "user": {
    "_id": "642bc0459ca5b87603eced7a",
    "email": "user@test.com",
    "id": "642bc0459ca5b87603eced7a"
  },
  "articles": [
    {
      "_id": "642bc0469ca5b87603eced87",
      "title": "this is a title",
      "body": "here is the body",
      "userId": "642bc0459ca5b87603eced7a",
      "createdAt": "2023-04-04T06:14:30.271Z",
      "updatedAt": "2023-04-04T06:14:30.271Z",
      "id": "642bc0469ca5b87603eced87"
    },
    {
      "_id": "642bc0469ca5b87603eced89",
      "title": "this is another title",
      "body": "here is the other body",
      "userId": "642bc0459ca5b87603eced7a",
      "createdAt": "2023-04-04T06:14:30.302Z",
      "updatedAt": "2023-04-04T06:14:30.302Z",
      "id": "642bc0469ca5b87603eced89"
    }
  ]
}
```
