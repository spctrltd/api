import mongoose from 'mongoose'
import schemaLoader from './loadSchemas.js'

const {MONGO_CONNECTION_STRING = 'mongodb://localhost:27019/spctr-api-testing'} = process.env

const userTemplate = {
	username: 'superuser',
	password: 'superpassword'
}

export default class database {
	constructor(options = {}) {
		const {defaultUser = userTemplate} = options
		this.connection = null
		this.defaultUser = defaultUser
		this.models = null
	}

	init = async () => {
		const {models} = await schemaLoader('mongodb')
		this.models = models
		await mongoose.connect(connectionString || MONGO_CONNECTION_STRING)
		await this.initAccount()
	}

	initAccount = async () => {
		const {
			username: defaultUserUsername = this.defaultUser.username,
			password: defaultUserPassword = this.defaultUser.password
		} = this.defaultUser

		const result_a = await this.findOne('accountuser', {username: defaultUserUsername})
		if (!result_a) {
			await this.insert('accountuser', {
				username: defaultUserUsername,
				password: defaultUserPassword
			})
		}
	}

	connect = async () => {
		await this.init()
		return this
	}

	count = (model, where) => {
	}

	findOne = async (model, data) => {
		return await this.models[model].findOne(data)
	}

	find = async query => {
	}

	insert = async (model, data) => {
		await new this.models[model](data)
        .save()
	}

	deleteAll = async (model, data) => {
		await this.models[model].deleteMany(data)
	}

	delete = async (model, data) => {
		await this.models[model].delete(data)
	}
}
