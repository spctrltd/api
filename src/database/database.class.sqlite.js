import path from 'path'
import {Sequelize} from 'sequelize'
import {fileExists, mkdir, gaurdedCondition, constants} from '../helper.js'
import schemaLoader from './loadSchemas.js'
import Database from './database.class.js'

const {IS_SQL, REQUIRES_CONDITION, DATABASE_TYPE_SQLITE} = constants

export default class extends Database {
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

		const {fields} = await schemaLoader(DATABASE_TYPE_SQLITE, this.sequelize)
		await this.sequelize.sync()
		// TODO: migrations
		await this.initAccount()
		this.models = this.sequelize.models
		this.fields = fields
		this.defineModels()
	}

	connect = async () => {
		await this.init()
		return this
	}

	count = async (model, data) => {
		return await this.sequelize.models[model].count(gaurdedCondition(data, IS_SQL))
	}

	findOne = async (model, data) => {
		return await this.sequelize.models[model].findOne(gaurdedCondition(data, IS_SQL))
	}

	findById = async (model, id) => {
		return await this.sequelize.models[model].findByPk(id)
	}

	find = async (model, data) => {
		return await this.sequelize.models[model].findAll(gaurdedCondition(data, IS_SQL))
	}

	insert = async (model, data) => {
		await this.sequelize.models[model].create(data)
	}

	delete = async (model, data) => {
		await this.sequelize.models[model].destroy(gaurdedCondition(data, IS_SQL, REQUIRES_CONDITION))
	}
}
