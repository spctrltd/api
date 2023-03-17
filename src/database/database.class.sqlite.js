import path from 'path'
import {Sequelize} from 'sequelize'
import {fileExists, mkdir, sequelizeOps} from '../helper.js'
import schemaLoader from './loadSchemas.js'
import Database from './database.class.js'

export default class extends Database {
	type = 'sqlite'
	constructor(options = {}) {
		super(options)
		const {databaseFile, memoryOnly = false} = options
		this.databaseFile = databaseFile
		this.memoryOnly = memoryOnly
		this.sequelize = null
		this.models = null
	}

	init = async () => {
		let storage = ':memory:'
		if (!this.memoryOnly) {
			let databaseFilePath = this.databaseFile
			if (!databaseFilePath) {
				const databaseDir = `${path.resolve('.')}/datastore`
				mkdir(databaseDir)
				databaseFilePath = `${databaseDir}/database.db`
			}
			const doesFileExist = await fileExists(databaseFilePath)
			if (!doesFileExist) {
				mkdir(path.dirname(databaseFilePath))
			}
			storage = databaseFilePath
		}
		this.sequelize = new Sequelize({
			dialect: this.type,
			storage
		})

		await schemaLoader(this.type, this.sequelize)
		await this.sequelize.sync()
		// migrations
		await this.initAccount()
		this.models = this.sequelize.models
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
		return await this.sequelize.models[model].findOne({where: sequelizeOps(data)})
	}

	findById = async (model, id) => {
		return await this.sequelize.models[model].findByPk(id)
	}

	find = async (model, data) => {
		let where = {}
		if (data) {
			where = {where: sequelizeOps(data)}
		}
		return await this.sequelize.models[model].findAll(where)
	}

	insert = async (model, data) => {
		await this.sequelize.models[model].create(data)
	}

	deleteAll = async model => {
		await this.sequelize.models[model].destroy({
			truncate: true
		})
	}

	delete = async (model, data) => {
		if (!data) {
			return
		}
		// TODO: check the model fields, if where has none return.
		await this.sequelize.models[model].destroy({where: sequelizeOps(data)})
	}
}
