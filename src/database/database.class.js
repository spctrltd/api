const userTemplate = {
	username: 'superuser',
	password: 'superpassword'
}

export default class {
	constructor(options = {}) {
		const {databaseFile, memoryOnly = false, defaultUser = userTemplate, connectionString} = options
		this.connection = null
		this.defaultUser = defaultUser
		this.databaseFile = databaseFile
		this.memoryOnly = memoryOnly
		this.sequelize = null
		this.models = null
		this.connectionString = connectionString
		this.DBO = {}
	}

	defineModels = () => {
		Object.keys(this.models).forEach(model => {
			this.DBO[model] = {
				count: data => this.count(model, data),
				findOne: data => this.findOne(model, data),
				findById: id => this.findById(model, id),
				find: data => this.find(model, data),
				insert: data => this.insert(model, data),
				deleteAll: () => this.deleteAll(model),
				delete: data => this.delete(model, data)
			}
		})
	}
}
