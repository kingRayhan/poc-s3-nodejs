import { useEffect, useRef, useState } from "react";

interface Post {
  uuid: string;
  caption: string;
  image: string;
}

const App = () => {
  const formRef = useRef<HTMLFormElement>(null);
  const [posts, setPosts] = useState<Post[]>([]);

  const fetchPosts = () => {
    fetch("http://localhost:3000/", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then((res) => res.json())
      .then((res) => {
        setPosts(res.posts);
      });
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const handlePostSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append("image", formRef.current?.image.files![0]);
    formData.append("caption", formRef.current?.caption.value);

    fetch("http://localhost:3000/", {
      method: "POST",
      body: formData,
    })
      .then((res) => res.json())
      .then((res) => {
        setPosts([...posts, res]);
        formRef.current?.reset();
        fetchPosts();
      });
  };

  return (
    <main className=" max-w-2xl mx-auto my-4">
      <form
        ref={formRef}
        onSubmit={handlePostSubmit}
        className="border-2 border-black rounded-lg p-4 flex flex-col gap-3"
      >
        <label htmlFor="">
          <input
            type="text"
            name="caption"
            placeholder="caption"
            className="border-2 border-black rounded-sm p-2 w-full"
          />
        </label>

        <input type="file" name="image" />
        <button className=" bg-indigo-500 text-white px-5 py-1 rounded-sm">
          Submit
        </button>
      </form>

      <div className="grid grid-cols-2 gap-4 my-4">
        {posts.map((post) => (
          <div key={post.uuid}>
            <img src={`http://localhost:3000/files/${post.image}`} />
            <p>{post.caption}</p>
          </div>
        ))}
      </div>
    </main>
  );
};

export default App;
