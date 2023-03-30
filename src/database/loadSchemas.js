import path from 'path'
import mongodbModel from './model.mongodb.js'
import sqliteModel from './model.sqlite.js'
import Helper from '../helper.class.js'

/**
 * Load config file and build database models.
 *
 * @async
 * @param {Symbol} databaseType - The database type.
 * @param {Sequelize|undefined} sequelize - If for SQL database, requires Sequelize.
 * @returns {Promise<Object>}
 */
export default async (databaseType, sequelize) => {
  const dataModels = {}
  const modelFields = {}
  const modelTests = {}
  const dataModelsPath = Helper.getAbsolutePath('./database/account')
  let fileList = Helper.createFileList(dataModelsPath, ['.json'], Helper.FILE_NAME_AS_KEY)
  const userDataModelsPath = `${path.resolve('.')}/data-models`
  const doesExist = await Helper.directoryExists(userDataModelsPath)
  if (doesExist) {
    fileList = Helper.createFileList(
      userDataModelsPath,
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
    const {model, fields, test} = await modelGenerator[databaseType](
      name,
      fileList[name],
      sequelize
    )
    dataModels[name] = model
    modelFields[name] = fields
    modelTests[name] = test
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
  return {models: dataModels, fields: modelFields, tests}
}
