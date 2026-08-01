"use client";

import { useEffect, useState } from "react";
import CustomButton from "@/components/site/CustomButton";

interface Candidate {
  _id: string;
  name: string;
  board: string;
  entry: string;
  img: string;
  status?: string;
}

const ITEMS_PER_PAGE = 6;

export default function CandidatesGrid() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetch("/api/allCandidates")
      .then((res) => res.json())
      .then((data: Candidate[]) => {
        setCandidates(data.filter((c) => c.status !== "inactive"));
        setLoading(false);
      })
      .catch((err) => {
        console.error("API Error:", err);
        setLoading(false);
      });
  }, []);

  const visibleCandidates = candidates.slice(0, page * ITEMS_PER_PAGE);

  const handleLoadMore = () => {
    if (page * ITEMS_PER_PAGE < candidates.length) {
      setPage((prev) => prev + 1);
    }
  };

  if (loading) {
    return <h2 style={{ textAlign: "center", marginTop: "50px" }}>Loading...</h2>;
  }

  return (
    <section style={{ paddingTop: "0" }} className="container sectionspace80">
      <div className="hall-of-fame-section">
        <div className="row g-4 col-12 mx-auto">
          {visibleCandidates.map((candidate) => (
            <div key={candidate._id} className="col-lg-4 col-md-6 col-12">
              <div className="Hall-of-fame-card">
                <img src={candidate?.img} alt={candidate?.name} />
                <div className="hof-content">
                  <h2>{candidate.name}</h2>
                  <span>{candidate?.board}</span>
                  <br />
                  <span>{candidate?.entry}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ================= PAGINATION FOOTER ================= */}
      <div className="col-12 row mx-auto mt-5 text-center align-items-center">
        <div className="col-sm-4 col-3"></div>

        <div className="col-sm-4 col-6 mx-auto d-flex justify-content-center">
          {page * ITEMS_PER_PAGE < candidates.length && <CustomButton text="Load More" onClick={handleLoadMore} />}
        </div>

        <div className="col-sm-4 col-3 text-end">
          <span className="bottom-paginate">
            {Math.min(page * ITEMS_PER_PAGE, candidates.length)} of {candidates.length}
          </span>
        </div>
      </div>
    </section>
  );
}
