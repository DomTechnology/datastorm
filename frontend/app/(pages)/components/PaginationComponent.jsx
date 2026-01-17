import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"


import {useState, useEffect} from "react";

const getPageRange = (currentPage , totalPages , maxVisible = 10) => {
    // Luôn hiển thị trang đầu và trang cuối
    let start = Math.max(2, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages - 1, currentPage + Math.floor(maxVisible / 2));

    // Điều chỉnh nếu currentPage ở gần đầu
    if (currentPage <= Math.ceil(maxVisible / 2)) {
        end = Math.min(totalPages - 1, maxVisible);
        start = 2;
    }
    // Điều chỉnh nếu currentPage ở gần cuối
    if (currentPage > totalPages - Math.ceil(maxVisible / 2)) {
        start = Math.max(2, totalPages - maxVisible + 1);
        end = totalPages - 1;
    }

    // Tạo mảng các trang ở giữa (từ start đến end)
    let pages = [];
    for (let i = start; i <= end; i++) {
        pages.push(i);
    }

    // Thêm trang 1 (luôn hiển thị)
    if (totalPages > 1) {
        if (!pages.includes(1)) {
            pages.unshift(1);
        }
    }
    
    // Thêm trang cuối (luôn hiển thị)
    if (totalPages > 1 && !pages.includes(totalPages)) {
        pages.push(totalPages);
    }
    
    return pages.filter(p => p >= 1 && p <= totalPages);
};
function findSeparator(array ){
    let result = [];
    let prev = 0;
    let current;
    
    for (let i = 0; i < array.length; i++){
        current = array[i];
        if (current === prev + 1){
            prev = current;
        }
        else{
            result.push(current - 1);
            prev = current;
        }
    }
    return result;
}

function PaginationComponent ({numberOfPages, currentPage, controlPage} ) {
    
    numberOfPages = numberOfPages ?? 0;
    currentPage = currentPage ?? 1;
    const [arrayPages, setArrayPages] = useState([]);
    const pageRange = getPageRange(currentPage, numberOfPages, 7);
    const separator = findSeparator(pageRange);
    useEffect(()=>{
        const tempArray = [];
        for(let i = 0; i < numberOfPages; i++)
        {
            tempArray.push(i);
        }
        setArrayPages(tempArray);
        
    }, [numberOfPages]);
    


    return(
        numberOfPages != 0 && <div>
            <Pagination>
            <PaginationContent>
                <PaginationItem className = "">
                <PaginationPrevious onClick = {()=> {controlPage && controlPage(currentPage - 1)}}
                    className = {`${currentPage - 1 === 0 ? "pointer-events-none text-gray-300": ""}`}/>
                </PaginationItem>
                {pageRange.map((items, index) => {
                    const isCurrent = items === currentPage;
                    const pageNumber = items;
                    let needSeparator = false;
                    for (let i = 0; i < separator.length; i++)
                    {
                        if (items - 1 === separator[i])
                        {
                            needSeparator = true;
                            break;
                        }
                    }
                    
                    let element = (
                        <PaginationItem key={index}>
                            <PaginationLink 
                                onClick={() => controlPage && controlPage(pageNumber)}
                                isActive={isCurrent}
                            >
                                {pageNumber}
                            </PaginationLink>
                        </PaginationItem>
                    );
                    
                    if (needSeparator){
                        element = (
                            <div key = {`ellipsis-${index}`} className = "flex">
                                <PaginationItem >
                                    <PaginationEllipsis></PaginationEllipsis>
                                </PaginationItem>
                                {element}
                            </div>
                        )
                    }
                    
                   

                    return element;

                })}
                <PaginationItem>
                <PaginationNext onClick = {()=> {controlPage && controlPage(currentPage + 1)}}
                    className = {`${currentPage  === numberOfPages ? "pointer-events-none text-gray-300": ""}`}/>
                </PaginationItem>
            </PaginationContent>
            </Pagination>
        </div>
    );
};
export default PaginationComponent;