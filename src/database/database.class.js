/**
 * Database class
 *
 * @class Database
 * @classdesc Parent database class
 */
export default class {
  constructor(options) {
    const {databaseFile, memoryOnly, defaultUser, connectionString, connectionOptions} = options

    this.defaultUser = defaultUser
    this.databaseFile = databaseFile
    this.memoryOnly = memoryOnly
    this.connectionString = connectionString
    this.connectionOptions = connectionOptions

    this.connection = null
    this.sequelize = null
    this.models = null
    this.DBO = {}
    this.fields = {}
    this.tests = {}
  }

  /**
   * Runs data population and migration operations.
   *
   * @memberof Database
   * @async
   * @function initAccount
   */
  initAccount = async () => {
    const {
      username: defaultUserUsername = this.defaultUser.username,
      password: defaultUserPassword = this.defaultUser.password
    } = this.defaultUser

    const result = await this.findOne('accountuser', {username: defaultUserUsername})
    if (result === null) {
      await this.insert('accountuser', {
        username: defaultUserUsername,
        password: defaultUserPassword
      })
    }
  }

  /**
   * Make model functions accessible as property of model.
   *
   * @memberof Database
   * @function defineModels
   * @example
   * this.DBO.model.count()
   */
  defineModels = () => {
    Object.keys(this.models).forEach(model => {
      this.DBO[model] = {
        count: data => this.count(model, data),
        findOne: (where, options) => this.findOne(model, where, options),
        findById: (id, options) => this.findById(model, id, options),
        find: (where, options) => this.find(model, where, options),
        insert: data => this.insert(model, data),
        delete: data => this.delete(model, data),
        updateOne: (where, data) => this.updateOne(model, where, data),
        update: (where, data) => this.update(model, where, data),
        upsert: (where, data) => this.upsert(model, where, data)
      }
    })
  }
}
