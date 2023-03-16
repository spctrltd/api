import sqlite from './database.class.sqlite.js'
import mongodb from './database.class.mongodb.js'

export default class database {
	constructor(options = {}) {
		const {type = 'sqlite'} = options
		this.type = type
		this.driver = null
	}

	init = async () => {
		switch (this.type) {
			case 'sqlite':
				this.driver = new sqlite()
				break
			case 'mongodb':
				this.driver = new mongodb()
				break
		}
		if (this.driver) {
			return await this.driver.connect()
		}

		return
	}
}