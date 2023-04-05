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
The usable DBO functions are:
```JS
count(where) = Number
findOne(where, options) = {}
findById(id, options) = {}
find(where, options) = []
insert(data) = {}
delete(where) = Number
updateOne(where, data) = Number
update(where, data) = Number
upsert(where, data) = {}
```
Parameters and return values are documented in [here](https://spctrltd.github.io/api/), but the jist is:
```JS
where = {}
/*
a "Select Where" filter, eg. {barcode: {$gt: 5}, active: true}
Typical Mongoose filtering can be used.
For SQL, dollar sign operators like $gt are translated to
Sequelize operators as far as possible.
Not all Sequelize operators are supported.
See sequelizeOpKeys function in the Helper Class for details.
*/
options = {
  populate = [
    'string', // relation name
    {path = required, select = optional} 
    /*
    Populate works as documented in Mongoose docs for MongoDB implementation.
    In SQL it only works as specified above. Where "select" will only include or exclude
    by selecting the first value in {page: 1, title: 1} which is page=1 and include
    only this and all other fields and excluding all if it was {page: -1, title: 1}
    */
  ], 
  skip = Number,
  limit = Number,
  sort,
  /*
  Sort works as documented in Mongoose docs for MongoDB implementation.
  In SQL it is not yet implemented
  */
  select
  /*
  Select works as documented in Mongoose docs for MongoDB implementation.
  In SQL it is not yet implemented
  */
}
/*
extra instructions
*/
```
# Adding Database Models
Specify an absolute path to your project's models in the database section of the config.
```JS
{
  database: {
    userDataModelPath: `${path.resolve('.')}/config/model`
  }
}
```
Model configs are JSON files, with the name of the file as the model name: eg. `article.json`. The model name is not pluralised or altered by Mongoose or Sequelize so it will always be referencable by the file name in your database and the code. The two "built-in" models `accountuser` and `accountotp` can be overwritten by placing files with the same names in your model directory.
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
Although the model structure is primarily designed to be used with MongoDB, if you keep it simple enough it can be interoperable with SQL. More specifically the Sequelize syntax.
In the `model` section above the following data types are supported:

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
  on mongodb it functions as documented.
  on SQL it creates a hasMany or hasOne relationship.
  see further down for example
  */ 
  // custom attributes
  encryptPassword = false, // if true, encrypts the passwordField upon create or update
  passwordField = ['password'], // if encryptPassword = true, encrypts all fields in the array
  idField = 'id',
  /* idField:
  sets the "primary key" field to ensure all
  database types reference the right/same field
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
The `test` section
```JSON
{
  "202": {
    /*
    The Number above is the Test Id.
    It is used as a reference by other database tests.
    It also specifies the order in which tests are run.
    */
      "label": "Insert an article",
      // The label is used in the output.
      "operation": "insert",
      // The operation is one of the DBO functions listed above
      "success": {
        // "success" can be substituted with "failure" to run a test to fail.
        "match": "both",
        /*
        Matches "response" value below with query response
        Valid options are "both", "key" or "value"
        */
        "parameters": [
        /*
        Parameters is an array that represents the parameters passed to the "operation"
        eg. findOne(where = {userId, title}, options = {skip: 1}) = [where, options]
        */
          {
            "userId": "[$cache$200$userId]",
            "title": "this is a title",
            "body": "here is the body"
          }
        ],
        "response": {
        /*
        Response is your expectation of the output. If can include all or some of the expect fields.
        */
          "userId": "[$cache$200$userId]",
          "title": "this is a title",
          "body": "here is the body"
        }
      }
    }
}
```
Variables in the format `[$cache$TEST_ID$RESPONSE_PATH]` can be used in the `parameters` or `response` section.
Responses from `success` tests are saved to a cache and can be retrieved by subsequent `success` or `failure` tests.
A response with this structure:
```JS
{
  body: {
    type: [
      'blue',
      'green'
    ],
    id: 1
  }
}
```
Can be referenced as:
```JSON
{
  "body": "[$cache$200$body]",
  "types": "[$cache$200$body$type]",
  "blue": "[$cache$200$body$type$0]",
  "green": "[$cache$200$body$type$1]",
  "id": "[$cache$200$body$id]",
}
```
Any of the functions in the Helper Class can also be used:
```JSON
{
  "password": "[$function$hash$testpassword123]",
}
```
The format is `[$function$HELPER_FUNCTION_NAME$PARAMS]` where multiple `PARAMS` are seperated by a dollor sign, eg. `[$function$isSameHashed$plainText$hashedValue]`

# Routes, Contollers and Middleware
Specify an absolute path to your project's routes in the server section of the config.
```JS
{
  server: {
    userRoutePath: `${path.resolve('.')}/config/route`
  }
}
```
This directory should have sub-directories: `config`, `handler` and `middleware`.

The `config` directory should contain one or more JSON files with the route definitions as an array of routes:
```JSON
[
  {
    "method": "GET",
    "path": "/session/articles",
    "middleware": "checkAuth",
    "handler": "article",
    "test": {
      "200": {
        "label": "Get all articles for logged in user",
        "success": {
          "match": "key",
          "payload": {
            "headers": {
              "Authorization": "Bearer [$cache$102$body$data$token]"
            }
          },
          "status": 200,
          "body": {
            "tag": true,
            "data": {
              "articles": true
            }
          }
        }
      }
    }
  }
]
```
API uses KoaJS under the hood as a server.
`method` and `path` are anything allowed by Koa Router.
`middleware` refers to a file with the name (eg. "checkAuth") in the middleware directory.
The file should export a default function in the following format:
```JS
// /config/route/middleware/checkAuth.js
export default async (ctx, next) => {
  const isAuthenticated = await ctx.helper.isAuthenticated(ctx)
  if (isAuthenticated) {
    await next() // next() is required. In async functions be sure to use await next()
  } else {
    ctx.status = 401
  }
}
```
`handler` follows the same specification as `middleware` but doesn't need `next()` to be called:
```JS
// /config/route/handler/article.js
export default async ctx => {
  const {id: userId} = await ctx.helper.getAuthenticatedUser(ctx)
  const articles = await ctx.DBO.article.find({userId}, {populate: [{path: 'author', select: {name: 1, surname: 1}}]})
  ctx.body = ctx.helper.formatedResponse({articles})
}
```
Handlers and Middleware are typical Koa Router implementations with `DBO` and `helper` added to the `ctx` object.