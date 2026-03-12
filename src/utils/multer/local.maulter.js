import path from "path"
import multer from "multer"

export const localFileUpload = () => {
    
    const storage = multer.diskStorage({
        destination : function (req,file,callback) {
            callback(null,path.resolve('./src/uploads'))
        },
        filename: function (req, file, callback) {
            console.log({file});
            const uniqueFileUpload = Math.random()+"_"+file.originalname
            callback(null,uniqueFileUpload) // name of file with extention
        }
    })
    return multer({
        dest: "./temp", // incase not u
        storage , // ناوى تخزن فينse storage
        
    })

}



