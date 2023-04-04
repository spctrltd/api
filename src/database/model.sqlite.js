/**
 * Interprets config data to construct a database model.
 *
 * @module model/sqlite
 */
import {DataTypes, Model} from 'sequelize'
import Helper from '../helper.class.js'

/**
 * Evaluates string to determine Database data type.
 *
 * @function getType
 * @param {String} name - A data type name.
 * @returns {Sequelize.DataTypes.StringDataTypeConstructor|null}
 */
const getType = name => {
  switch (name) {
    case 'String':
      return {type: DataTypes.STRING}
    case 'Boolean':
      return {type: DataTypes.BOOLEAN}
    case 'Date':
      return {type: DataTypes.DATE}
    case 'Number':
      return {type: DataTypes.NUMBER}
    case 'ObjectId':
      return {type: DataTypes.INTEGER}
    case 'Mixed':
      return {type: DataTypes.BLOB}
    case 'Virtual':
      return {type: DataTypes.VIRTUAL}
    default:
      return null
  }
}

/**
 * Evaluates JS array type to determine Database Array type.
 *
 * @function arrayType
 * @param {Array} data - An Array to evaluate.
 * @returns {Array|null}
 */
const arrayType = data => {
  if (Array.isArray(data)) {
    let dataType = null
    if (data.length === 1) {
      dataType = getType(data[0])
      if (dataType !== null) {
        dataType = [dataType]
      } else if (typeof data[0] === 'string') {
        dataType = data
      }
    }
    return dataType === null ? data.map(setDataType) : dataType
  }
  return null
}

/**
 * Evaluates JS data type to determine Database data type.
 *
 * @function evalDataType
 * @param {Object|String|Array|null} data - A type to evaluate.
 * @returns {Object|String|Array|null}
 */
const evalDataType = data => {
  let dataType = data
  if (typeof data === 'string') {
    dataType = getType(data)
  } else if (Array.isArray(data)) {
    // TODO: CHECK THIS FOR SQL CONTEXT
    dataType = arrayType(data)
  } else if (typeof data === 'object') {
    dataType = setDataType(data)
  }
  return dataType === null ? data : dataType
}

/**
 * Iterates over JS datatypes to find database data types.
 *
 * @function setDataType
 * @param {Object|String|Array|null} structure - A type to evaluate.
 * @returns {Object|String|Array|null}
 */
const setDataType = (structure, options = {}) => {
  if (typeof structure === 'object') {
    const {encryptPassword = false, passwordField = ['password'], idField = 'id'} = options

    return Object.keys(structure).reduce((acc, key) => {
      let dataType = evalDataType(structure[key])
      if (encryptPassword && passwordField.includes(key)) {
        dataType = {
          ...dataType,
          set(value) {
            this.setDataValue(key, Helper.hash(value))
          }
        }
      }
      if (idField && key === idField) {
        dataType = {
          ...dataType,
          autoIncrement: true,
          primaryKey: true
        }
      }
      return {
        ...acc,
        [key]: dataType
      }
    }, {})
  }

  return evalDataType(structure)
}

/**
 * Load config file and build a database model.
 *
 * @async
 * @param {String} name - The model name.
 * @param {String} modelPath - Absolute path to the model config file.
 * @param {Sequelize} sequelize - Sequelize class.
 * @returns {Promise<Object>}
 */
export default async (name, modelPath, sequelize) => {
  const config = Helper.readJsonFile(modelPath)

  if (config.model) {
    const models = Object.keys(sequelize.models)
    if (models.includes(name)) {
      return {model: sequelize.models[name]}
    }
    const modelStructure = setDataType(config.model, config.schema)
    const {timestamps = true, virtuals} = config.schema || {}

    const sqlModel = class extends Model {}

    sqlModel.init(modelStructure, {
      timestamps,
      sequelize,
      modelName: name,
      freezeTableName: true
    })

    return {
      model: sequelize.models[name],
      fields: Object.keys(config.model),
      test: config.test,
      virtuals
    }
  }

  return null
}
