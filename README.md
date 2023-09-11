# S P C T R . L T D . API

## Install
```
# nodejs >= 18
npm install @spctrltd/api
```

## Quick Start
```JS
import Api from '@spctrltd/api'
const api = new Api()
api.start()
```

## Testing
```JS
import Api, {Test} from '@spctrltd/api'
import path from 'path'

const mongoDBConfig = {
  database: {
    type: Api.DATABASE_TYPE_MONGODB,
    connectionString: 'mongodb://localhost:27017/spctr-api-unit-test'
  },
  test: {
    shutdown: true,
    dropDatabase: true
  }
}

const sqliteConfig = {
  database: {
    type: Api.DATABASE_TYPE_SQLITE,
    databaseFile: `${path.resolve('.')}/datastore/spctr-api-unit-test.db`
  },
  test: {
    shutdown: true,
    dropDatabase: true
  }
}

const test = new Test(mongoDBConfig)
test.start()
```

## Default Config
```JS
{
  database: {
    type: Helper.DATABASE_TYPE_SQLITE, // currently only MongoDB and SQLite type
    databaseFile: undefined, // if SQLite, creates file in project's root directory if undefined
    memoryOnly: false, // SQLite only
    defaultUser: {
      username: 'superuser',
      password: 'superpassword'
    },
    connectionString: undefined, // MongoDB Only
    connectionOptions: {autoIndex: false}, // MongoDB Only
    userDataModelPath: undefined, // Absolute path to user-defined models
    initialiseUserAccount: false,
    /*
    create default database data for user authentication. If true, this will create
    default user (at defaultUser property) and otp database tables/collections 
    for use with the default authentication routes
    */
    addConnection: false
    /*
    when creating the database class make this a seperate
    database connection to the server's
    */
  },
  server: {
    sessionKey: Helper.defaultKey, // server token encryption hash
    formatedResponse: Helper.formatedResponse, // a function that formats the http response data
    httpsConfig: {
      key: undefined, // fs.readFileSync('/app/server-private-key.pem'),
      cert: undefined // fs.readFileSync('/app/server-certificate.pem')
    },
    uploadDir: '/tmp/dump',
    allowCors: false,
    port: 8000,
    proxy: undefined,
    morgan: ['common'],
    userRoutePath: undefined // Absolute path to user-defined routes (see docs for more details)
  },
  service: {
    otp: otp => Helper.developerPrinter({otp}) // a function for sending the otp code. arguments = (otp, databaseObject) (see docs for example)
  },
  account: {
    secretKey: Helper.defaultKey, // encrypting JWT
    usernameField: 'username', // the formfield when logging in (see docs for example)
    jwtExpiresInMinutes: Helper.defaultExpireToken, // 3 minutes
    jwtRefreshExpiresInMinutes: Helper.defaultExpireRefresh // 5 minutes
  },
  system: {
    developerPrinter: Helper.developerPrinter // a function that prints to STDOUT in dev enironment or debug mode (see docs for example)
  },
  test: {
    shutdown: false, // exit the running server after testing completes
    dropDatabase: false // drop the test database
  }
}
```
## Guide
[Walkthrough](./WALKTHROUGH.md)