

export const findOne = async ({ model, filter = {}, select = "" } = {}) => {
    return await model.findOne(filter).select(select)
}

export const findById = async ({ model, id } = {}) => {
    return await model.findById(id)
}

export const find = async ({
  model,
  filter = {},
  select = "",
  populate = [],
  options = {},
} = {}) => {
  return await model
    .find(filter, select, options)
    .populate(populate);
};


export const create = async ({ model , data=[{}], options={} }) => {
    return await model.create(data,options)
}

export const findOneAndUpdate = async (
    { model, filter = {}, data = {}, select = "", populate = [], options = { runValidators: true, new: true } }) => {
    return await model.findOneAndUpdate(filter, {
        ...data,
        $inc:{__v : 1}
    },options).select(select).populate(populate)
}

export const updateOne = async (
  {
    model,
    filter = {},
    data = {},
    options = { runValidators: true }  // تقدري تزودي options لو حابة
  } = {}
) => {
  return await model.updateOne(
    filter,
    {
      ...data,
      $inc: { __v: 1 },   // نفس حركة الـ __v اللي في findOneAndUpdate
    },
    options
  );
};




export const deleteOne = async (
    { model, filter = {}}) => {
    return await model.deleteOne(filter)
}