import { snakeToCamel } from '../util/key-case';

export const parseOne = sc => snakeToCamel(sc);
export const parseMany = scList => scList.map(parseOne);
