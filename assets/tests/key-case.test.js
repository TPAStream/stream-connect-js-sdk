import { snakeToCamel, camelToSnake } from '../shared/util/key-case'

it("Snake to camel works on toplevel object", () => {
    const newObj = snakeToCamel({
        test_string_time: "wow",
        test_next_key_for_this_object: "ok"
    });


    expect(newObj.testStringTime).toBe("wow")
    expect(newObj.testNextKeyForThisObject).toBe("ok")
    expect(newObj.test_string_time).toBe(undefined)
    expect(newObj.test_next_key_for_this_object).toBe(undefined)

})

it("Snake to camel works on nested objects", () => {
    const newObj = snakeToCamel({
        test_string_time: {
            test_next_key_for_this_object: "ok"
        },
    });

    expect(typeof newObj.testStringTime).toBe("object")
    expect(newObj.testStringTime.testNextKeyForThisObject).toBe("ok")
    expect(newObj.test_string_time).toBe(undefined)
})

it("Camel to snake works on toplevel object", () => {
    const newObj = camelToSnake({
        testStringTime: "wow",
        testNextKeyForThisObject: "ok"
    });


    expect(newObj.test_string_time).toBe("wow")
    expect(newObj.test_next_key_for_this_object).toBe("ok")
    expect(newObj.testStringTime).toBe(undefined)
    expect(newObj.testNextKeyForThisObject).toBe(undefined)

})

it("Camel to snake works on nested objects", () => {
    const newObj = camelToSnake({
        testStringTime: {
            testNextKeyForThisObject: "ok"
        },
    });

    expect(typeof newObj.test_string_time).toBe("object")
    expect(newObj.test_string_time.test_next_key_for_this_object).toBe("ok")
    expect(newObj.testStringTime).toBe(undefined)
})