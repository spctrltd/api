/**
 * Interprets config data to construct a database model.
 *
 * @module model/mongodb
 */
import mongoose from 'mongoose'
import Helper from '../helper.class.js'

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
  const config = Helper.readJsonFile(modelPath)

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
      toJSON = {},
      toObject = {},
      virtuals
    } = config.schema || {}

    const schema = new mongoose.Schema(modelStructure, {
      timestamps,
      versionKey,
      toJSON: virtuals ? {...toJSON, virtuals: true} : toJSON,
      toObject: virtuals ? {...toObject, virtuals: true} : toObject
    })

    if (virtuals) {
      Object.keys(virtuals).forEach(virtualKey => {
        schema.virtual(virtualKey, virtuals[virtualKey])
      })
    }

    schema.pre('save', function (next) {
      if (idField) {
        this[idField] = this._id
      }
      if (encryptPassword) {
        if (this.isModified(passwordField)) {
          this[passwordField] = Helper.hash(this[passwordField])
        }
      }
      return next()
    })

    schema.pre('updateOne', function (next) {
      const doc = this.getUpdate()
      if (doc[passwordField]) {
        doc[passwordField] = Helper.hash(doc[passwordField])
      }
      return next()
    })

    return {
      model: mongoose.model(name, schema),
      fields: Object.keys(config.model),
      test: config.test
    }
  }

  return null
}
