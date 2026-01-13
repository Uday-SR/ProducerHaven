import React from "react";

interface UploadProps {
  label?: string;
  onUpload: (files: FileList) => void;
}


const Upload: React.FC<UploadProps> = ({ 
  label = "Choose a file", 
  onUpload
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      onUpload(e.target.files);
    }
  };

  return (
    <div className="mt-5 border-4 px-10 py-3 text-1xl rounded-3xl border-emerald-300 shadow-amber-300 transition-all duration-300 hover:shadow-cyan-300 hover:border-amber-300" >
      <label 
        htmlFor="upload"
        className=""
      >
        {label}
      </label>
      <input
        id="upload"
        type="file"
        onChange={handleChange}
        style={{ display: "none" }}
      />
    </div>
  );
};

export default Upload;
