import mongoose from 'mongoose'
import {readJsonFile, hash} from '../helper.js'

/**
 * Evaluates string to determine Database data type.
 *
 * @function getType
 * @param {String} name - A data type name.
 * @returns {Object|null}
 */
const getType = name => {
  switch (name) {
    case 'String':
      return String
    case 'Boolean':
      return Boolean
    case 'Date':
      return Date
    case 'Number':
      return Number
    case 'ObjectId':
      return mongoose.Schema.ObjectId
    case 'Mixed':
      return mongoose.Schema.Types.Mixed
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
const setDataType = structure => {
  if (typeof structure === 'object') {
    return Object.keys(structure).reduce((acc, key) => {
      const dataType = evalDataType(structure[key])
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
 * @param {String} name - The model name.
 * @param {String} modelPath - Absolute path to the model config file.
 * @returns {Object}
 */
export default (name, modelPath) => {
  const config = readJsonFile(modelPath)

  if (config.model) {
    const models = mongoose.modelNames()
    if (models.includes(name)) {
      return {model: mongoose.model(name)}
    }
    const modelStructure = setDataType(config.model)
    const {
      timestamps = true,
      versionKey = false,
      encryptPassword = false,
      passwordField = 'password',
      idField,
      toJSON,
      virtuals
    } = config.schema || {}

    const schema = new mongoose.Schema(modelStructure, {
      timestamps,
      versionKey,
      toJSON
    })

    if (virtuals) {
      Object.keys(virtuals).forEach(virtualKey => {
        const {options, ref, localField, foreignField} = virtuals[virtualKey]
        schema.virtual(localField, {
          // TODO: TEST POPULATE !!!
          options,
          ref,
          localField,
          foreignField
        })
      })
    }

    if (encryptPassword) {
      schema.pre('save', function (next) {
        if (idField) {
          this[idField] = this._id
        }
        if (this.isModified(passwordField)) {
          this[passwordField] = hash(this[passwordField])
        }
        return next()
      })
    }

    return {model: mongoose.model(name, schema), fields: Object.keys(config.model)}
  }

  return null
}
