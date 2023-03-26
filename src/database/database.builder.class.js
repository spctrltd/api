import Sqlite from './database.class.sqlite.js'
import Mongodb from './database.class.mongodb.js'
import {constants} from '../helper.js'

const {DATABASE_TYPE_SQLITE, DATABASE_TYPE_MONGODB} = constants

/**
 * Database Builder class
 *
 * @class DatabaseBuilder
 * @classdesc Builds a specific database based on type value passed
 */
export default class {
	drivers = {
		[DATABASE_TYPE_SQLITE]: Sqlite,
		[DATABASE_TYPE_MONGODB]: Mongodb
	}

	constructor({type, ...options}) {
		this.options = options
		this.type = type
	}

	/**
	 * Initialise database connection.
	 *
	 * @memberof DatabaseBuilder
	 * @async
	 * @function init
	 * @returns {Promise<Database|null>}
	 */
	init = async () => {
		this.loadDrivers()
		const Driver = this.drivers[this.type]
		if (Driver) {
			const database = new Driver(this.options)
			return await database.connect()
		}

		return null
	}

	/**
	 * Load user-defined drivers.
	 *
	 * @memberof DatabaseBuilder
	 * @function loadDrivers
	 */
	loadDrivers = () => {
		// TODO: find user defined drivers
	}
}
