import path from 'path'
import {Sequelize} from 'sequelize'
import {fileExists, mkdir, gaurdedCondition, constants} from '../helper.js'
import schemaLoader from './loadSchemas.js'
import Database from './database.class.js'

const {IS_SQL, REQUIRES_CONDITION, DATABASE_TYPE_SQLITE} = constants

/**
 * Database class
 *
 * @class SQLiteDatabase
 * @classdesc SQLite class
 */
export default class extends Database {
  /**
   * Configure, build models and intialise connection.
   *
   * @memberof SQLiteDatabase
   * @async
   * @function init
   */
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

    const {fields, tests} = await schemaLoader(DATABASE_TYPE_SQLITE, this.sequelize)
    await this.sequelize.sync()
    // TODO: migrations
    await this.initAccount()
    this.models = this.sequelize.models
    this.fields = fields
    this.tests = tests
    this.defineModels()
  }

  /**
   * Connection facade.
   *
   * @memberof SQLiteDatabase
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
   * @memberof SQLiteDatabase
   * @async
   * @function disconnect
   */
  disconnect = async () => {
    await this.sequelize.close()
  }

  /**
   * Count rows.
   *
   * @memberof SQLiteDatabase
   * @async
   * @function count
   * @param {String} model - Name of the database model.
   * @param {Object} where - An object that specifies filter parameters.
   * @returns {Promise<Number>}
   */
  count = async (model, data) => {
    const number = await this.sequelize.models[model].count(gaurdedCondition(data, IS_SQL))
    return parseInt(number)
  }

  /**
   * Find one row.
   *
   * @memberof SQLiteDatabase
   * @async
   * @function findOne
   * @param {String} model - Name of the database model.
   * @param {Object} where - An object that specifies filter parameters.
   * @returns {Promise<Object>}
   */
  findOne = async (model, data) => {
    return await this.sequelize.models[model].findOne(gaurdedCondition(data, IS_SQL))
  }

  /**
   * Find one row by its Id.
   *
   * @memberof SQLiteDatabase
   * @async
   * @function findById
   * @param {String} model - Name of the database model.
   * @param {String|Number} id - An integer or string that specifies the row Id.
   * @returns {Promise<Object>}
   */
  findById = async (model, id) => {
    return await this.sequelize.models[model].findByPk(id)
  }

  /**
   * Find one or more rows.
   *
   * @memberof SQLiteDatabase
   * @function find
   * @param {String} model - Name of the database model.
   * @param {Object} where - An object that specifies filter parameters.
   * @returns {Promise<Array>}
   */
  find = async (model, data) => {
    return await this.sequelize.models[model].findAll(gaurdedCondition(data, IS_SQL))
  }

  /**
   * Insert a row.
   *
   * @memberof SQLiteDatabase
   * @async
   * @function insert
   * @param {String} model - Name of the database model.
   * @param {Object} data - An object that specifies the row contents.
   * @returns {Promise<Object>}
   */
  insert = async (model, data) => {
    return await this.sequelize.models[model].create(data)
  }

  /**
   * Update one row.
   *
   * @memberof SQLiteDatabase
   * @async
   * @function updateOne
   * @param {String} model - Name of the database model.
   * @param {Object} where - An object that specifies filter parameters.
   * @param {Object} data - An object that specifies the row contents.
   * @returns {Promise<Number>}
   */
  updateOne = async (model, where, data) => {
    const {affectedCount} = await this.sequelize.models[model].update(data, {
      ...gaurdedCondition(where, IS_SQL),
      limit: 1
    })
    return parseInt(affectedCount)
  }

  /**
   * Update one or more rows.
   *
   * @memberof SQLiteDatabase
   * @async
   * @function update
   * @param {String} model - Name of the database model.
   * @param {Object} where - An object that specifies filter parameters.
   * @param {Object} data - An object that specifies the row contents.
   * @returns {Promise<Number>}
   */
  update = async (model, where, data) => {
    const {affectedCount} = await this.sequelize.models[model].update(
      data,
      gaurdedCondition(where, IS_SQL)
    )
    return parseInt(affectedCount)
  }

  /**
   * Update or Insert a row.
   *
   * @memberof SQLiteDatabase
   * @async
   * @function upsert
   * @param {String} model - Name of the database model.
   * @param {Object} where - An object that specifies filter parameters.
   * @param {Object} data - An object that specifies the row contents.
   * @returns {Promise<Object>}
   */
  upsert = async (model, where, data) => {
    await this.sequelize.models[model].upsert(data, gaurdedCondition(where, IS_SQL))
    return await this.findOne(model, where)
  }

  /**
   * Delete a row.
   *
   * @memberof SQLiteDatabase
   * @async
   * @function delete
   * @param {String} model - Name of the database model.
   * @param {Object} where - An object that specifies filter parameters.
   * @returns {Promise<Number>}
   */
  delete = async (model, where) => {
    const number = await this.sequelize.models[model].destroy(
      gaurdedCondition(where, IS_SQL, REQUIRES_CONDITION)
    )
    return parseInt(number)
  }
}
