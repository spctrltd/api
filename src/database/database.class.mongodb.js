import mongoose from 'mongoose'
import schemaLoader from './loadSchemas.js'
import Database from './database.class.js'

const {MONGODB_CONNECTION_STRING} = process.env

export default class extends Database {
	type = 'mongodb'
	constructor(options = {}) {
		super(options)
		const {connectionString} = options
		this.connectionString = connectionString || MONGODB_CONNECTION_STRING
	}

	init = async () => {
		const {models} = await schemaLoader(this.type)
		this.models = models
		await mongoose.connect(this.connectionString)
		await this.initAccount()
		this.defineModels()
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

	connect = async () => {
		await this.init()
		return this
	}

	count = (model, where) => {}

	findOne = async (model, data) => {
		return await this.models[model].findOne(data)
	}

	findById = async (model, id) => {
		return await this.sequelize.models[model].findById(id)
	}

	find = async query => {}

	insert = async (model, data) => {
		await new this.models[model](data).save()
	}

	deleteAll = async (model, data) => {
		await this.models[model].deleteMany(data)
	}

	delete = async (model, data) => {
		await this.models[model].delete(data)
	}
}
