export default class {
	constructor(options) {
		const {databaseFile, memoryOnly, defaultUser, connectionString} = options

		this.defaultUser = defaultUser
		this.databaseFile = databaseFile
		this.memoryOnly = memoryOnly
		this.connectionString = connectionString

		this.connection = null
		this.sequelize = null
		this.models = null
		this.DBO = {}
		this.fields = {}
	}

	initAccount = async () => {
		const {
			username: defaultUserUsername = this.defaultUser.username,
			password: defaultUserPassword = this.defaultUser.password
		} = this.defaultUser

		const result = await this.findOne('accountuser', {username: defaultUserUsername})
		if (!result) {
			await this.insert('accountuser', {
				username: defaultUserUsername,
				password: defaultUserPassword
			})
		}
	}

	defineModels = () => {
		Object.keys(this.models).forEach(model => {
			this.DBO[model] = {
				count: data => this.count(model, data),
				findOne: data => this.findOne(model, data),
				findById: id => this.findById(model, id),
				find: data => this.find(model, data),
				insert: data => this.insert(model, data),
				delete: data => this.delete(model, data)
			}
		})
	}
}
