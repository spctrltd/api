import path from 'path'
import {Sequelize} from 'sequelize'
import {fileExists, mkdir, sequelizeOps} from '../helper.js'
import schemaLoader from './loadSchemas.js'

const userTemplate = {
	username: 'superuser',
	password: 'superpassword'
}

export default class database {
	constructor(options = {}) {
		const {databaseFile, memoryOnly = false, defaultUser = userTemplate} = options
		this.connection = null
		this.defaultUser = defaultUser
		this.databaseFile = databaseFile
		this.memoryOnly = memoryOnly
		this.sequelize = null
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
			dialect: 'sqlite',
			storage
		})

		await schemaLoader('sqlite', this.sequelize)
		await this.sequelize.sync()
		// migrations
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
		return await this.sequelize.models[model].findOne({where: sequelizeOps(data)})
	}

	find = async data => {
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
