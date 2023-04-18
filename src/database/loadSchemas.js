/**
 * Facilitates the loading of a database model.
 *
 * @module loadSchemas
 */
import mongodbModel from './model.mongodb.js'
import sqliteModel from './model.sqlite.js'
import Helper from '../helper.class.js'

/**
 * Load config file and build database models.
 *
 * @name loadSchemas
 * @function
 * @async
 * @param {Symbol} databaseType - The database type.
 * @param {String} userDataModelPath - Absolute path to user-defined models.
 * @param {Boolean} initialiseUserAccount - Whether to create the authentication data.
 * @param {Sequelize|undefined} sequelize - If for SQL database, requires Sequelize.
 * @returns {Promise<Object>}
 */
export default async (databaseType, userDataModelPath, initialiseUserAccount, sequelize) => {
  const dataModels = {}
  const modelFields = {}
  const modelTests = {}
  const modelVirtuals = {}
  const dataModelsPath = Helper.getAbsolutePath('./database/account')
  let fileList = {}

  if (initialiseUserAccount) {
    fileList = Helper.createFileList(dataModelsPath, ['.json'], Helper.FILE_NAME_AS_KEY)
  }

  const doesExist = await Helper.directoryExists(userDataModelPath)
  if (doesExist) {
    fileList = Helper.createFileList(
      userDataModelPath,
      ['.json'],
      Helper.FILE_NAME_AS_KEY,
      fileList
    )
  }

  const modelGenerator = {
    [Helper.DATABASE_TYPE_MONGODB]: mongodbModel,
    [Helper.DATABASE_TYPE_SQLITE]: sqliteModel
  }

  for (let x = 0; x < Object.keys(fileList).length; x++) {
    const name = Object.keys(fileList)[x]
    const {model, fields, test, virtuals} = await modelGenerator[databaseType](
      name,
      fileList[name],
      sequelize
    )
    dataModels[name] = model
    modelFields[name] = fields
    modelTests[name] = test
    modelVirtuals[name] = virtuals
  }
  const tests = []
  if (Object.keys(modelTests).length > 0) {
    for (let y = 0; y < Object.keys(modelTests).length; y++) {
      const modelName = Object.keys(modelTests)[y]
      const testCases = modelTests[modelName]
      if (testCases && typeof testCases === 'object') {
        for (let z = 0; z < Object.keys(testCases).length; z++) {
          const testId = Object.keys(testCases)[z]
          tests.push({
            ...testCases[testId],
            model: modelName,
            id: testId
          })
        }
      }
    }
  }
  tests.sort((a, b) => {
    return a.id - b.id
  })
  if (sequelize) {
    Object.keys(modelVirtuals).forEach(modelName => {
      const primaryModel = sequelize.models[modelName]
      const modelVirtual = modelVirtuals[modelName]
      if (modelVirtual) {
        Object.keys(modelVirtual).forEach(modelVirtualName => {
          const virtual = modelVirtual[modelVirtualName]
          const virtualModel = sequelize.models[virtual.ref]
          const associationFunction = virtual.justOne ? 'hasOne' : 'hasMany'
          primaryModel[associationFunction](virtualModel, {
            as: modelVirtualName,
            foreignKey: virtual.foreignField,
            sourceKey: virtual.localField,
            constraints: false
          })
        })
      }
    })
  }
  return {models: dataModels, fields: modelFields, tests, virtuals: modelVirtuals}
}
