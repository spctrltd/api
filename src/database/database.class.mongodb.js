import mongoose from 'mongoose'
import schemaLoader from './loadSchemas.js'
import Database from './database.class.js'
import {gaurdedCondition, constants} from '../helper.js'

const {REQUIRES_CONDITION, DATABASE_TYPE_MONGODB, IS_NOT_SQL} = constants

export default class extends Database {
	init = async () => {
		const {models, fields} = await schemaLoader(DATABASE_TYPE_MONGODB)
		this.models = models
		this.fields = fields
		await mongoose.connect(this.connectionString)
		await this.initAccount()
		this.defineModels()
	}

	connect = async () => {
		await this.init()
		return this
	}

	count = async (model, where) => {
		return await this.models[model].countDocuments(where)
	}

	findOne = async (model, data) => {
		return await this.models[model].findOne(data)
	}

	findById = async (model, id) => {
		return await this.models[model].findById(id)
	}

	find = async (model, data) => {
		return await this.models[model].find(data)
	}

	insert = async (model, data) => {
		await new this.models[model](data).save()
	}

	delete = async (model, data) => {
		await this.models[model].deleteMany(gaurdedCondition(data, IS_NOT_SQL, REQUIRES_CONDITION))
	}
}
