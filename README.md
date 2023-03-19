# Install
```
# nodejs >= 18
npm install @spctrltd/api
```

## Usage
```JS
import Api from '@spctrltd/api'
const api = new Api()
api.start()
```

## Default Config
```JS
{
	database: {
		type: Api.DATABASE_TYPE_SQLITE, // currently only MongoDB and SQLite type
		databaseFile: undefined, // if SQLite, creates file in root directory
		memoryOnly: false, // SQLite only
		defaultUser: {
			username: 'superuser',
			password: 'superpassword'
		},
		connectionString: undefined // MongoDB Only
	},
	server: {
		sessionKey: defaultKey, // token encryption hash
		formatedResponse, // a function that formats the http response data
		httpsConfig: {
			key: undefined, // fs.readFileSync('/app/server-private-key.pem'),
			cert: undefined // fs.readFileSync('/app/server-certificate.pem')
		},
		uploadDir: '/tmp/dump',
		allowCors: false,
		port: 8000,
		proxy: undefined
	},
	service: {
		otp: otp => developerPrinter({otp}) // a function for sending the otp code. arguments = (otp, databaseObject)
	},
	account: {
		secretKey: defaultKey, // encrypting JWT
		usernameField: 'username', // the formfield when logging in
		jwtExpiresInMinutes: defaultExpireToken, // 3 minutes
		jwtRefreshExpiresInMinutes: defaultExpireRefresh // 5 minutes
	},
	system: {
		developerPrinter // a function that print to STDOUT in deve enironment
	}
}
```