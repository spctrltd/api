import mongoose from 'mongoose'
import schemaLoader from './loadSchemas.js'
import Database from './database.class.js'
import Helper from '../helper.class.js'

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
    const {models, fields, tests} = await schemaLoader(
      Helper.DATABASE_TYPE_MONGODB,
      this.userDataModelPath
    )
    this.models = models
    this.fields = fields
    this.tests = tests
    await mongoose.connect(this.connectionString, this.connectionOptions)
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
   * @function disconnect
   */
  disconnect = async () => {
    await mongoose.disconnect()
  }

  /**
   * Drop the database.
   *
   * @memberof MongoDatabase
   * @async
   * @function dropDatabase
   */
  dropDatabase = async () => {
    await mongoose.connection.dropDatabase()
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
    try {
      const number = await this.models[model].estimatedDocumentCount(where)
      return parseInt(number)
    } catch (error) {
      Helper.developerPrinter(error)
      return -1
    }
  }

  /**
   * Find one document.
   *
   * @memberof MongoDatabase
   * @async
   * @function findOne
   * @param {String} model - Name of the database model.
   * @param {Object} where - An object that specifies filter parameters.
   * @param {Object} options - An object that specifies options.
   * @returns {Promise<Object>}
   */
  findOne = async (model, where, options = {}) => {
    try {
      let response
      if (this.hasOptions(options)) {
        response = this.models[model].findOne(where)
        response = this.setSelectOptions(response, options)
        response = await response.exec()
      } else {
        response = await this.models[model].findOne(where)
      }
      return response !== null ? response.toObject() : null
    } catch (error) {
      Helper.developerPrinter(error)
      return undefined
    }
  }

  /**
   * Find one document by its Id.
   *
   * @memberof MongoDatabase
   * @async
   * @function findById
   * @param {String} model - Name of the database model.
   * @param {String|ObjectId} id - An object or string that specifies the document Id.
   * @param {Object} options - An object that specifies options.
   * @returns {Promise<Object>}
   */
  findById = async (model, id, options = {}) => {
    try {
      let response
      if (this.hasOptions(options)) {
        response = this.models[model].findById(id)
        response = this.setSelectOptions(response, options)
        response = await response.exec()
      } else {
        response = await this.models[model].findById(id)
      }
      return response !== null ? response.toObject() : null
    } catch (error) {
      Helper.developerPrinter(error)
      return undefined
    }
  }

  /**
   * Find one or more documents.
   *
   * @memberof MongoDatabase
   * @function find
   * @param {String} model - Name of the database model.
   * @param {Object} where - An object that specifies filter parameters.
   * @param {Object} options - An object that specifies options.
   * @returns {Promise<Array>}
   */
  find = async (model, where, options = {}) => {
    try {
      let response
      if (this.hasOptions(options)) {
        response = this.models[model].find(where)
        response = this.setSelectOptions(response, options)
        response = await response.exec()
      } else {
        response = await this.models[model].find(where)
      }
      return response.map(doc => doc.toObject())
    } catch (error) {
      Helper.developerPrinter(error)
      return undefined
    }
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
    try {
      const response = await new this.models[model](data).save()
      return response !== null ? response.toObject() : null
    } catch (error) {
      Helper.developerPrinter(error)
      return undefined
    }
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
    try {
      const {matchedCount} = await this.models[model].updateOne(where, data)
      return parseInt(matchedCount)
    } catch (error) {
      Helper.developerPrinter(error)
      return -1
    }
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
    try {
      const {matchedCount} = await this.models[model].updateMany(where, data)
      return parseInt(matchedCount)
    } catch (error) {
      Helper.developerPrinter(error)
      return -1
    }
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
    try {
      await this.models[model].updateOne(where, data, {upsert: true})
      const response = await this.findOne(model, where)
      const {_doc = null} = response || {}
      return _doc
    } catch (error) {
      Helper.developerPrinter(error)
      return undefined
    }
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
    try {
      const {deletedCount} = await this.models[model].deleteMany(
        Helper.gaurdedCondition(where, Helper.IS_NOT_SQL, Helper.REQUIRES_CONDITION)
      )
      return parseInt(deletedCount)
    } catch (error) {
      Helper.developerPrinter(error)
      return -1
    }
  }

  /**
   * Populate a virtual or ref field.
   *
   * @memberof MongoDatabase
   * @function setSelectOptions
   * @param {Query} query - The query to run the operation on.
   * @param {Object} options - An object with querying options.
   * @returns {Query}
   */
  setSelectOptions = (query, options) => {
    const {populate, skip, limit, sort, select} = options
    let optionsQuery = query
    if (Array.isArray(populate) && populate.length > 0) {
      for (let x = 0; x < populate.length; x++) {
        optionsQuery = optionsQuery.populate(populate[x])
      }
    }
    if (skip) {
      optionsQuery.skip(skip)
    }
    if (limit) {
      optionsQuery.limit(limit)
    }
    if (sort) {
      optionsQuery.sort(sort)
    }
    if (select) {
      optionsQuery.select(select)
    }
    return optionsQuery
  }
}
