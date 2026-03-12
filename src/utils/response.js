export const asyncHandeler = (fn) => {
    return async (req, res, next) => {
        await fn(req, res, next).catch(error => {
            return res.status(500).json({
                error_message: "server error",
                error,
                stack: error.stack,
                message:error.body
            })
        })
    }
}


export const globalErorrHandeling = (erorr, req, res, next) => {
    return res.status(erorr.cause || 500).json({message:erorr.message , stack:erorr.stack})
}

export const successResponse = ({
  res,
  status = 200,
  message = "done",
  data = {}
} = {}) => {
  return res.status(status).json({ message, data });
};

