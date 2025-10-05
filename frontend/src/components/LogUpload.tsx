import axios from "axios";
import { ChangeEvent, useState } from "react"

type UploadStatus = "idle" | "uploading" | "success" | "error"

const LogUpload = () => {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<UploadStatus>("idle")
  const [errorMessage, setErrorMessage] = useState<string>("")


  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
        setFile(e.target.files[0])
        setStatus("idle")
        setErrorMessage("")
    }
  }

   async function handleFileUpload () {
    if (!file) return;

    setStatus("uploading")
    setErrorMessage("")

    const formData = new FormData();
    formData.append("file", file);

    try {
        const token = localStorage.getItem("access_token");
        const response =  await axios.post("http://localhost:8000/api/logs/upload", formData, {
          headers: {
            'Content_Type': 'multipart/form-data',   
            Authorization: `Bearer ${token}`,
          },
        });

        setStatus("success")
        console.log("Upload response:", response.data)
    } catch (error: any) {
        setStatus("error")
        const message = error.response?.data?.detail || "Upload failed. Please try again."
        setErrorMessage(message)
        console.log(error)
    }
  }


  return (
    <div className="space-y-4">
        <input type="file" onChange={handleFileChange}/>
        {file && (
            <div className="mb-4 text-sm">
                <p>File name : {file.name}</p>
                <p>File size : {(file.size / 1024).toFixed(2)} KB</p>
                <p>File type : {file.type}</p>
            </div>
        )}
        {file && status !== "uploading" &&
            <button onClick={handleFileUpload}>Upload</button>
        }
        {status === "success" &&
            <p className="text-sm text-green-600">
                Upload successfully
            </p>
        }        
        {status === "error" &&
            <p className="text-sm text-red-600">
                {errorMessage}
            </p>
        }
    </div>
  )
}

export default LogUpload