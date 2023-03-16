import {Model} from 'sequelize'
import {validPassword} from '../helper.js'

export default class SQLModel extends Model {
	methods = {
		validPassword
	}
}