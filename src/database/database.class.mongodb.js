import mongoose from 'mongoose'
import schemaLoader from './loadSchemas.js'
import Database from './database.class.js'
import {gaurdedCondition, constants} from '../helper.js'

const {REQUIRES_CONDITION, DATABASE_TYPE_MONGODB, IS_NOT_SQL} = constants

/**
 * Database class
 *
 * @class MongoDatabase
 * @classdesc MongoDB class
 */
export default class extends Database {
	/**
	 * Configure, build models and intialise connection.
	 *
	 * @memberof MongoDatabase
	 * @async
	 * @function init
	 */
	init = async () => {
		const {models, fields} = await schemaLoader(DATABASE_TYPE_MONGODB)
		this.models = models
		this.fields = fields
		await mongoose.connect(this.connectionString)
		await this.initAccount()
		this.defineModels()
	}

	/**
	 * Connection facade.
	 *
	 * @memberof MongoDatabase
	 * @async
	 * @function connect
	 * @returns {Promise<Database>}
	 */
	connect = async () => {
		await this.init()
		return this
	}

	/**
	 * End connection.
	 *
	 * @memberof MongoDatabase
	 * @async
	 * @function connect
	 */
	disconnect = async () => {
		await mongoose.disconnect()
	}

	/**
	 * Count documents.
	 *
	 * @memberof MongoDatabase
	 * @async
	 * @function count
	 * @param {String} model - Name of the database model.
	 * @param {Object} where - An object that specifies filter parameters.
	 * @returns {Promise<Number>}
	 */
	count = async (model, where) => {
		const number = await this.models[model].estimatedDocumentCount(where)
		return parseInt(number)
	}

	/**
	 * Find one document.
	 *
	 * @memberof MongoDatabase
	 * @async
	 * @function findOne
	 * @param {String} model - Name of the database model.
	 * @param {Object} where - An object that specifies filter parameters.
	 * @returns {Promise<Object>}
	 */
	findOne = async (model, where) => {
		return await this.models[model].findOne(where)
	}

	/**
	 * Find one document by its Id.
	 *
	 * @memberof MongoDatabase
	 * @async
	 * @function findById
	 * @param {String} model - Name of the database model.
	 * @param {String|ObjectId} id - An object or string that specifies the document Id.
	 * @returns {Promise<Object>}
	 */
	findById = async (model, id) => {
		return await this.models[model].findById(id)
	}

	/**
	 * Find one or more documents.
	 *
	 * @memberof MongoDatabase
	 * @function find
	 * @param {String} model - Name of the database model.
	 * @param {Object} where - An object that specifies filter parameters.
	 * @returns {Promise<Array>}
	 */
	find = async (model, where) => {
		return await this.models[model].find(where)
	}

	/**
	 * Insert a document.
	 *
	 * @memberof MongoDatabase
	 * @async
	 * @function insert
	 * @param {String} model - Name of the database model.
	 * @param {Object} data - An object that specifies the document contents.
	 * @returns {Promise<Object>}
	 */
	insert = async (model, data) => {
		return await new this.models[model](data).save()
	}

	/**
	 * Update one document.
	 *
	 * @memberof MongoDatabase
	 * @async
	 * @function updateOne
	 * @param {String} model - Name of the database model.
	 * @param {Object} where - An object that specifies filter parameters.
	 * @param {Object} data - An object that specifies the document contents.
	 * @returns {Promise<Number>}
	 */
	updateOne = async (model, where, data) => {
		const {matchedCount} = await this.models[model].updateOne(where, data)
		return parseInt(matchedCount)
	}

	/**
	 * Update one or more documents.
	 *
	 * @memberof MongoDatabase
	 * @async
	 * @function update
	 * @param {String} model - Name of the database model.
	 * @param {Object} where - An object that specifies filter parameters.
	 * @param {Object} data - An object that specifies the document contents.
	 * @returns {Promise<Number>}
	 */
	update = async (model, where, data) => {
		const {matchedCount} = await this.models[model].updateMany(where, data)
		return parseInt(matchedCount)
	}

	/**
	 * Update or Insert a document.
	 *
	 * @memberof MongoDatabase
	 * @async
	 * @function upsert
	 * @param {String} model - Name of the database model.
	 * @param {Object} where - An object that specifies filter parameters.
	 * @param {Object} data - An object that specifies the document contents.
	 * @returns {Promise<Object>}
	 */
	upsert = async (model, where, data) => {
		await this.models[model].updateOne(where, data, {upsert: true})
		return await this.findOne(model, where)
	}

	/**
	 * Delete a document.
	 *
	 * @memberof MongoDatabase
	 * @async
	 * @function delete
	 * @param {String} model - Name of the database model.
	 * @param {Object} where - An object that specifies filter parameters.
	 * @returns {Promise<Number>}
	 */
	delete = async (model, where) => {
		const {deletedCount} = await this.models[model].deleteMany(
			gaurdedCondition(where, IS_NOT_SQL, REQUIRES_CONDITION)
		)
		return parseInt(deletedCount)
	}
}
